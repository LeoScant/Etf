// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./PriceConsumer.sol";
import "./Interfaces/IWETH.sol";

address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
address constant SWAPROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;

// Struct to represent a cryptocurrency in the pool
struct CryptoToken {
    string symbol; // Symbol of the cryptocurrency (e.g., "ETH")
    uint256 weight; // Weight of the cryptocurrency in the pool
    address tokenContract; // Address of the cryptocurrency contract
    PriceConsumerV3 priceFeed; // Chainlink contract to get the price of the cryptocurrency
}

struct InizializationInfo {
    string symbol;
    address tokenContract;
    address priceFeedAddress;
}

struct CurrentTokenInfo {
    int256 price;
    uint256 marketCap;
    uint256 weight;
    uint256 value;
}

struct TokenToBuyInfo {
    uint256 tokenIndex;
    uint256 amount;
}

contract DynamicEtf is ERC20 {
    ISwapRouter constant router = ISwapRouter(SWAPROUTER);
    PriceConsumerV3 public ethUsdContract;
    CryptoToken[] public cryptoTokens;
    uint256 constant balanceFactor = 1000;

    event TokenBought(string tokenSymbol, uint256 amount);
    event TokenSold(string tokenSymbol, uint256 amount);
    event EthSent(address recipient, uint256 amount);
    event CryptoTokenMinted(address sender, uint256 amount);
    event CryptoTokenBurnt(address sender, uint256 amount);

    // Inizialize the pool with the list of cryptocurrencies
    constructor(InizializationInfo[] memory _tokenInfo) ERC20("CryptoETF", "CETF") {
        for (uint256 i = 0; i < _tokenInfo.length; i++) {
            InizializationInfo memory token = _tokenInfo[i];
            addCryptoToken(
                token.symbol,
                token.tokenContract,
                token.priceFeedAddress
            );
        }
    }

    // Function to add a cryptocurrency to the pool
    function addCryptoToken(
        string memory _symbol,
        address _tokenContractAddress,
        address _priceFeedAddress
    ) internal {
        PriceConsumerV3 priceFeed = new PriceConsumerV3(_priceFeedAddress);

        CryptoToken memory newToken = CryptoToken({
            symbol: _symbol,
            weight: 0,
            tokenContract: _tokenContractAddress,
            priceFeed: priceFeed
        });
        cryptoTokens.push(newToken);
    }

    
    /**
     * @dev Calculates the amount of tokens to buy or sell based on the current market conditions and portfolio balance.
     * @param isBuying Boolean indicating whether the calculation is for buying or selling tokens.
     * @return totalWalletValue The total value of the portfolio.
     * @return amountsToBuy An array containing the amounts of tokens to buy for each cryptocurrency.
     * @return amountsToSell An array containing the amounts of tokens to sell for each cryptocurrency.
     */
    function calculateAmount(bool isBuying) internal returns (uint256, uint256[] memory, uint256[] memory) {
        uint256 totalMarketCap = 0;
        uint256 totalWalletValue;
        uint256[] memory amountsToBuy = new uint256[](cryptoTokens.length);
        uint256[] memory amountsToSell = new uint256[](cryptoTokens.length);
        CurrentTokenInfo[] memory tokenInfoArray = new CurrentTokenInfo[](cryptoTokens.length);

        // Calculate the current price and market cap for each cryptocurrency and the total market cap of the cryptos in the pool
        for (uint256 i = 0; i < cryptoTokens.length; i++) {
            tokenInfoArray[i].price = cryptoTokens[i].priceFeed.getLatestPrice();
            tokenInfoArray[i].marketCap = uint256(tokenInfoArray[i].price) * IERC20(cryptoTokens[i].tokenContract).totalSupply() / 1e18;
            totalMarketCap += tokenInfoArray[i].marketCap;

            // Calculate the current value of the portfolio for each cryptocurrency and the total Value of the portfolio
            tokenInfoArray[i].value = (IERC20(cryptoTokens[i].tokenContract).balanceOf(address(this)) * uint256(tokenInfoArray[i].price)) / 1e18;
            totalWalletValue += tokenInfoArray[i].value;
        }

        // Calculate the weight of each cryptocurrency
        // the actual weight is calculated as the value of the token in the pool divided by the total value of the pool
        // the ideal weight is calculated as the market cap of the token divided by the total market cap of all the tokens in the pool
        for (uint256 i = 0; i < cryptoTokens.length; i++) {
            tokenInfoArray[i].weight = totalWalletValue == 0 ? (tokenInfoArray[i].value * balanceFactor) : (tokenInfoArray[i].value * balanceFactor) / totalWalletValue;
            uint256 newWeight = (tokenInfoArray[i].marketCap * balanceFactor) / totalMarketCap;
            cryptoTokens[i].weight = newWeight;

            uint256 idealValue = (totalWalletValue * newWeight) / balanceFactor;

            // If the current value is less than the ideal value, buy tokens
            if (isBuying && tokenInfoArray[i].value < idealValue) {
                uint256 amount = (idealValue - tokenInfoArray[i].value);
                amountsToBuy[i] = amount;
            }
            // If the current value is greater than the ideal value, sell tokens
            else if (!isBuying && tokenInfoArray[i].value > idealValue) {
                uint256 amount = (tokenInfoArray[i].value - idealValue);
                amountsToSell[i] = amount;
            }
        }

        return (totalWalletValue, amountsToBuy, amountsToSell);
    }

    /**
     * @dev Allows users to buy tokens of the DynamicEtf contract by providing ETH.
     * The ETH is converted to WETH and then used to swap for the desired crypto tokens.
     * The amount of each crypto token to buy is calculated based on the current portfolio weights.
     * The tokens are then swapped and the corresponding amount of shares is minted to the buyer.
     * Emits a TokenBought event for each token bought and a CryptoTokenMinted event for the shares minted.
     */
    function buyToken() external payable {
        uint256 totalAmountToBuy = msg.value;

        // Deposit the ETH value of the transaction into the WETH contract and approve the SWAPROUTER to spend the deposited WETH
        IWETH(WETH).deposit{value: msg.value}();
        IWETH(WETH).approve(address(SWAPROUTER), msg.value);

        // Get the total value of the portfolio and the amount of each token to buy
        (
            uint256 totalWalletValue,
            uint256[] memory calculatedAmountsToBuy,

        ) = calculateAmount(true);

        // Create a new array to store the amounts to buy for each crypto token
        uint256[] memory amountsToBuy = new uint256[](cryptoTokens.length);
        uint256 totalAmountOut;

        for (uint256 i = 0; i < amountsToBuy.length && totalAmountToBuy > 0; i++) {
            // Determine the amount to buy for the current crypto token
            amountsToBuy[i] = calculatedAmountsToBuy[i] < totalAmountToBuy
                ? calculatedAmountsToBuy[i]
                : totalAmountToBuy;
            totalAmountToBuy -= amountsToBuy[i];
        }

        for (uint256 i = 0; i < cryptoTokens.length; i++) {
            CryptoToken memory token = cryptoTokens[i];

            // Calculate the amount to buy for the current crypto token based on its weight
            uint amount = amountsToBuy[i] + ((totalAmountToBuy * token.weight) / balanceFactor);

            // Swap WETH for the current crypto token and get the amount received
            uint256 amountOut = swapToken(
                WETH,
                token.tokenContract,
                address(this),
                amount
            );
            emit TokenBought(token.symbol, amountOut);
            totalAmountOut += amountOut;
        }
        uint256 totalSupply = totalSupply();

        // Calculate the shares to mint based on the total supply and the value of the transaction
        uint256 sharesToMint = totalSupply == 0 || totalWalletValue == 0 ?
            msg.value :
            (msg.value * totalSupply) / totalWalletValue;

        // Mint the shares to the sender of the transaction
        _mint(msg.sender, sharesToMint);
        emit CryptoTokenMinted(msg.sender, sharesToMint);
    }

    /**
     * @dev Allows users to sell tokens of the DynamicEtf contract and receive ETH in return.
     * The amount of each token to sell is calculated based on the current portfolio weights.
     * The tokens are then swapped and the corresponding amount of shares is burned from the seller.
     * Emits a TokenSold event for each token sold and an EthSent event for the ETH sent to the seller.
     * 
     * @param tokenAmount The amount of tokens to sell.
     */
    function sellToken(uint256 tokenAmount) external {
        require(tokenAmount > 0, "Amount must be > 0");
        require(
            tokenAmount <= balanceOf(msg.sender),
            "Amount must be <= balance"
        );

        // Calculate the total value of the portfolio and the amount of each token to sell
        (
            uint256 totalWalletValue,
            ,
            uint256[] memory calculatedAmountsToSell
        ) = calculateAmount(false);

        // Calculate the total amount of ETH to receive based on the token amount and total supply
        uint256 totalEthOut = (tokenAmount * totalWalletValue) / totalSupply();
        uint256 totalAmountOut;
        uint256[] memory amountsToSell = new uint256[](cryptoTokens.length);

        // Calculate the amount of each token to sell based on the ETH value and portfolio weights
        for (uint256 i = 0; i < cryptoTokens.length && totalEthOut > 0; i++) {
            amountsToSell[i] = calculatedAmountsToSell[i] < totalEthOut
                ? calculatedAmountsToSell[i]
                : totalEthOut;

            totalEthOut -= amountsToSell[i];
        }

        // Sell each token and receive ETH in return
        for (uint256 i = 0; i < cryptoTokens.length; i++) {
            CryptoToken memory token = cryptoTokens[i];
            int256 price = token.priceFeed.getLatestPrice();

            // Calculate the amount of the token to sell based on the ETH value and token price
            uint256 amountToSell = ((amountsToSell[i] + ((totalEthOut * token.weight)/ balanceFactor)) * 1e18) 
            / (uint256(price));

            require(amountToSell > 0, "Amount to sell must be > 0");
            require(amountToSell <= IERC20(cryptoTokens[i].tokenContract).balanceOf(address(this)), "Amount to sell must be <= balance");

            // Approve the SWAPROUTER to spend the token to be sold
            IERC20(cryptoTokens[i].tokenContract).approve(
                address(SWAPROUTER),
                amountToSell
            );

            // Swap the token for ETH and get the amount of ETH received
            uint256 amountOut = swapToken(
                cryptoTokens[i].tokenContract,
                WETH,
                address(this),
                amountToSell
            );
            emit TokenSold(token.symbol, amountToSell);
            totalAmountOut += amountOut;
        }

        // Withdraw the total amount of ETH received
        IWETH(WETH).withdraw(totalAmountOut);
        TransferHelper.safeTransferETH(msg.sender, totalAmountOut);
        emit EthSent(msg.sender, totalAmountOut);

        // Burn the specified amount of tokens from the seller
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
    function withdraw() external {
        uint256 amount = address(this).balance;
        TransferHelper.safeTransferETH(msg.sender, amount);
    }
}
