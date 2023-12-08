// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./PriceConsumer.sol";
import "./Interfaces/IWETH.sol";

// Indirizzo del contratto WETH in Mainnet
address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
address constant SWAPROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;

struct CryptoToken {
    string symbol; // Simbolo della criptovaluta (ad es. "ETH")
    uint256 weight; // Peso della criptovaluta nella pool
    address tokenContract; // Indirizzo del contratto della criptovaluta
}


contract StaticEtf is ERC20, Ownable {
    ISwapRouter constant router = ISwapRouter(SWAPROUTER);
    PriceConsumerV3 public ethUsdContract;
    uint public totalWeight;

    event TokenBought(string tokenSymbol, uint256 amount);
    event TokenSold(string tokenSymbol, uint256 amount);
    event EthSent(address recipient, uint256 amount);
    event CryptoTokenMinted(address sender, uint256 amount);
    event CryptoTokenBurnt(address sender, uint256 amount);

    // Lista delle criptovalute nella pool
    CryptoToken[] public cryptoTokens;

    constructor(CryptoToken[] memory _cryptoTokens) ERC20("CryptoETF", "CETF") Ownable(msg.sender) {
        for (uint256 i = 0; i < _cryptoTokens.length; i++) {
            CryptoToken memory token = _cryptoTokens[i];
            addCryptoToken(token.symbol, token.tokenContract, token.weight);
            totalWeight += token.weight;
        }
    }

    function getTokens() external view returns (CryptoToken[] memory) {
        return cryptoTokens;
    }

    // Funzione per aggiungere una criptovaluta alla pool
    function addCryptoToken(
        string memory _symbol,
        address _tokenContract,
        uint256 _weight
    ) internal {
        CryptoToken memory newToken = CryptoToken({
            symbol: _symbol,
            weight: _weight,
            tokenContract: _tokenContract
        });
        cryptoTokens.push(newToken);
    }

    function buyToken() external payable {
        require(msg.value > 0, "Amount must be > 0");
        uint amountAfterFee = (msg.value * 997) / 1000;
        IWETH(WETH).deposit{value: amountAfterFee}();
        IWETH(WETH).approve(address(SWAPROUTER), amountAfterFee);
        uint256 shares;

        for (uint256 i = 0; i < cryptoTokens.length; i++) {
            uint amount = (amountAfterFee * cryptoTokens[i].weight) / totalWeight;
            require(amount > 0, "Amount must be > 0");

            ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
                .ExactInputSingleParams({
                    tokenIn: WETH,
                    tokenOut: cryptoTokens[i].tokenContract,
                    fee: 3000,
                    recipient: address(this),
                    deadline: block.timestamp + 300,
                    amountIn: amount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                });

            uint256 amountOut = router.exactInputSingle(params);
            emit TokenBought(cryptoTokens[i].symbol, amountOut);
            shares += amountOut;
        }
        _mint(msg.sender, shares);
        emit CryptoTokenMinted(msg.sender, shares);
    }

    function sellToken(uint256 tokenAmount) external {
        require(tokenAmount > 0, "Amount must be > 0");
        require(
            tokenAmount <= balanceOf(msg.sender),
            "Amount must be <= balance"
        );
        uint totalSupply = totalSupply();
        uint256 totalAmountOut;

        for (uint256 i = 0; i < cryptoTokens.length; i++) {
            uint256 amountToSell = (tokenAmount * IERC20(cryptoTokens[i].tokenContract).balanceOf(address(this))) / totalSupply;
            require(amountToSell > 0, "Amount to sell must be > 0");

            IERC20(cryptoTokens[i].tokenContract).approve(
                address(SWAPROUTER),
                amountToSell
            );

            ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
                .ExactInputSingleParams({
                    tokenIn: cryptoTokens[i].tokenContract,
                    tokenOut: WETH,
                    fee: 3000,
                    recipient: address(this),
                    deadline: block.timestamp + 300,
                    amountIn: amountToSell,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                });
            uint256 amountOut = router.exactInputSingle(params);
            emit TokenSold(cryptoTokens[i].symbol, amountToSell);
            totalAmountOut += amountOut;
        }

        IWETH(WETH).withdraw(totalAmountOut);
        uint amountAfterFee = (totalAmountOut * 997) / 1000;
        TransferHelper.safeTransferETH(msg.sender, amountAfterFee);
        emit EthSent(msg.sender, amountAfterFee);

        _burn(msg.sender, tokenAmount);
        emit CryptoTokenBurnt(msg.sender, tokenAmount);
    }

    receive() external payable {}

    //function to withdraw ETH from this contract
    function withdraw() external onlyOwner {
        uint256 amount = address(this).balance;
        TransferHelper.safeTransferETH(msg.sender, amount);
    }
}
