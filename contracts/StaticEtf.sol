// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./PriceConsumer.sol";
import "./Interfaces/IWETH.sol";

// Address of the WETH contract on Mainnet
address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
// Address of the SwapRouter contract on Mainnet
address constant SWAPROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;

struct CryptoToken {
    string symbol; // Symbol of the cryptocurrency (e.g., "ETH")
    uint256 weight; // Weight of the cryptocurrency in the pool
    address tokenContract; // Address of the cryptocurrency contract
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

    // List of cryptocurrencies in the pool
    CryptoToken[] public cryptoTokens;

    constructor(
        CryptoToken[] memory _cryptoTokens
    ) ERC20("CryptoETF", "CETF") Ownable(msg.sender) {
        for (uint256 i = 0; i < _cryptoTokens.length; i++) {
            CryptoToken memory token = _cryptoTokens[i];
            addCryptoToken(token.symbol, token.tokenContract, token.weight);
            totalWeight += token.weight;
        }
    }

    // Function to add a cryptocurrency to the pool
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

    /**
     * @dev Allows users to buy tokens of the ETF by providing ETH.
     * The ETH is used to purchase a basket of crypto tokens based on their weights.
     * The purchased tokens are then minted and assigned to the buyer.
     * @notice The amount of ETH provided must be greater than 0.
     * @notice The function uses the Uniswap V3 router to perform token swaps.
     */
    function buyToken() external payable {
        require(msg.value > 0, "Amount must be > 0");

        // Calculate the amount of ETH after deducting the fee
        uint amountAfterFee = (msg.value * 997) / 1000;

        // Deposit the amount of ETH into the WETH contract and
        // approve the SWAPROUTER to spend the deposited WETH
        IWETH(WETH).deposit{value: amountAfterFee}();
        IWETH(WETH).approve(address(SWAPROUTER), amountAfterFee);

        uint256 shares;

        // Loop through each crypto token in the pool
        for (uint256 i = 0; i < cryptoTokens.length; i++) {
            // Calculate the amount of the crypto token to buy based on its weight
            uint amount = (amountAfterFee * cryptoTokens[i].weight) /
                totalWeight;
            require(amount > 0, "Amount must be > 0");

            // Perform the token swap and get the amount of tokens received
            uint256 amountOut = swapToken(
                WETH, 
                cryptoTokens[i].tokenContract, 
                address(this), 
                amount
            );
            emit TokenBought(cryptoTokens[i].symbol, amountOut);

            // Add the amount of tokens bought to the total shares
            shares += amountOut;
        }

        // Mint the purchased tokens and assign them to the buyer
        _mint(msg.sender, shares);

        // Emit an event to indicate the minting of the tokens
        emit CryptoTokenMinted(msg.sender, shares);
    }

    /**
    * @dev Allows users to sell tokens of the ETF for ETH.
    * The tokens are burned and the corresponding ETH is sent to the user.
    * The ETH is sent to the user after deducting the fee.
    * The function uses the Uniswap V3 router to perform token swaps.
    * @param tokenAmount The amount of tokens to sell
    * @notice The amount of tokens to sell must be greater than 0 and
    * must be less than or equal to the balance of the user.
    */
    function sellToken(uint256 tokenAmount) external {
        // Ensure that the token amount is greater than 0 and
        // that the user has enough tokens to sell
        require(tokenAmount > 0, "Amount must be > 0");
        require(
            tokenAmount <= balanceOf(msg.sender),
            "Amount must be <= balance"
        );
        // Initialize a variable to keep track of the total amount received from selling tokens
        uint256 totalAmountOut;
        uint256 totalSupply = totalSupply();

        for (uint256 i = 0; i < cryptoTokens.length; i++) {
            // Calculate the amount of tokens to sell based on the token amount and the balance of the token contract
            uint256 amountToSell = (tokenAmount *
                IERC20(cryptoTokens[i].tokenContract).balanceOf(
                    address(this)
                )) / totalSupply;

            require(amountToSell > 0, "Amount to sell must be > 0");

            // Approve the token transfer from the contract to the swap router
            IERC20(cryptoTokens[i].tokenContract).approve(
                address(SWAPROUTER),
                amountToSell
            );

            // Perform the token swap and get the amount received
            uint256 amountOut = swapToken(
                cryptoTokens[i].tokenContract,
                WETH,
                address(this),
                amountToSell
            );

            // Emit an event to indicate that the token has been sold
            emit TokenSold(cryptoTokens[i].symbol, amountToSell);

            // Add the amount received to the total amount received
            totalAmountOut += amountOut;
        }

        // Withdraw the total amount of ETH from the WETH contract
        // and calculate the amount after deducting the fee
        IWETH(WETH).withdraw(totalAmountOut);
        uint amountAfterFee = (totalAmountOut * 997) / 1000;

        // Transfer the amount after fee to the user
        TransferHelper.safeTransferETH(msg.sender, amountAfterFee);
        emit EthSent(msg.sender, amountAfterFee);

        // Burn the tokens from the user
        _burn(msg.sender, tokenAmount);
        emit CryptoTokenBurnt(msg.sender, tokenAmount);
    }

    function swapToken(
        address tokenIn,
        address tokenOut,
        address recipient,
        uint amountIn
    ) internal returns (uint256) {
        require(amountIn > 0, "Amount must be > 0");
        return
            router.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenOut,
                    fee: 3000,
                    recipient: recipient,
                    deadline: block.timestamp + 300,
                    amountIn: amountIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
    }

    receive() external payable {}

    //function to withdraw ETH from this contract
    function withdraw() external onlyOwner {
        uint256 amount = address(this).balance;
        TransferHelper.safeTransferETH(msg.sender, amount);
    }
}
