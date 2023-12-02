// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./PriceConsumer.sol";
import "./Interfaces/IWETH.sol";

address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
address constant SWAPROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;

contract Etf is ERC20{
    ISwapRouter constant router = ISwapRouter(SWAPROUTER);

    PriceConsumerV3 public ethUsdContract;
    // Struttura per rappresentare una criptovaluta nella pool
    struct CryptoToken {
        string symbol;  // Simbolo della criptovaluta (ad es. "ETH")
        uint256 weight;  // Peso della criptovaluta nella pool
        address tokenContract;  // Indirizzo del contratto della criptovaluta
        PriceConsumerV3 priceFeed;  // Contratto Chainlink per il prezzo
    }

    // Lista delle criptovalute nella pool
    CryptoToken[] public cryptoTokens;

    constructor() ERC20('CryptoETF', 'CETF'){}

    // Funzione per aggiungere una criptovaluta alla pool
    function addCryptoToken(string memory _symbol, address _tokenContract, address _priceFeed) external {
        PriceConsumerV3 priceFeed = new PriceConsumerV3(_priceFeed);

        CryptoToken memory newToken = CryptoToken({
            symbol: _symbol,
            weight: 0,
            tokenContract: _tokenContract,
            priceFeed: priceFeed
        });
        cryptoTokens.push(newToken);
    }

    // Funzione per riequilibrare la pool in base alla capitalizzazione di mercato e al prezzo
    function rebalance() public {
        uint256 totalMarketCap = 0;
        int256[] memory price = new int256[](cryptoTokens.length);
        uint256[] memory circulatingSupply = new uint256[](cryptoTokens.length);
        for (uint256 i = 0; i < cryptoTokens.length; i++) {
            circulatingSupply[i] = IERC20(cryptoTokens[i].tokenContract).totalSupply();
            price[i] = cryptoTokens[i].priceFeed.getLatestPrice();
            totalMarketCap += uint256(price[i]) * circulatingSupply[i];
        }
        for (uint256 i = 0; i < cryptoTokens.length; i++) {
            uint256 newWeight = (uint256(price[i]) * circulatingSupply[i]) * 100 / totalMarketCap;
            cryptoTokens[i].weight = newWeight;
        }
    }

    function getTokens() external view returns (CryptoToken[] memory) {
        return cryptoTokens;
    }

    function buyToken() external payable {
        rebalance();
        IWETH(WETH).deposit{ value: msg.value }();
        IWETH(WETH).approve(address(SWAPROUTER), msg.value);
        
        for (uint256 i = 0; i < cryptoTokens.length; i++) {
            CryptoToken storage token = cryptoTokens[i];
            uint amount = (msg.value * token.weight) / 100;     
            require(amount>0, "Amount must be > 0");
            router.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: WETH,
                    tokenOut: token.tokenContract,
                    fee: 3000,
                    recipient: address(this),
                    deadline: block.timestamp + 300,
                    amountIn: amount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );       
        }
        _mint(msg.sender, msg.value);
    }
}
