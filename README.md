# StaticEtf and DynamicEtf Smart Contracts

This project features two smart contracts "StaticEtf" and "DynamicEtf". The objective of these contracts is to simulate a decentralized ETF on the blockchain utilizing Tokens.

In the case of StaticEtf, at the time of contract deployment, the Tokens that will compose the ETF are specified, which includes three parameters for each:
- The symbol
- The weight the token will occupy in my pool
- The address of the Smart Contract that governs the token

Whenever a user wishes to buy a portion of this ETF, they must call the "buyToken" function, passing ETH according to the amount they want to invest.
The contract, with these ETH, will purchase the Tokens which make up my ETF, according to the predetermined weight that has been defined, using the Uniswap pools.
It will then return to the user, a quantity of CryptoTokens minted by the contract that represents the tokens just purchased.

Likewise, if a user wishes to sell their CryptoTokens in exchange for ETH, they can call the sellToken function specifying how many CryptoTokens they want to sell.
The contract, still utilizing the Uniswap pools, will sell the held Tokens in a quantity based on the weight of each within my ETF and on how many CryptoTokens were sent. The ETH collected from the sale will then be forwarded to the user.

In the case of DynamicEtf, the behavior is similar, but the weight of each Token in my ETF is not predetermined. Instead, it is calculated dynamically based on market capitalization: the higher the market capitalization, the greater weight my token will bear in my ETF.

Upon deployment, I specify the tokens that will make up the ETF by defining for each one: 
- The symbol
- The address of the Smart Contract that governs the token
- The address of the Chainlink oracle which determines its price in ETH

Every time a user calls the "buyToken" function passing ETH, the "calculateAmount" function is called to recalculate for each token the weight it should have in my ETF. If it is currently unbalanced, it defines how much ETH of that token should be purchased so that before all the sent ETH are spent, the ETF is rebalanced.

After the Token quantities held are correct and balanced, I use the remaining ETH to purchase the Tokens based on the newly calculated weight and mint an appropriate amount of CryptoTokens.

In the same way, when a user wishes to sell their CryptoTokens, they call the "sellToken" function. Through the "calculateAmount" function, it recalculates the weight of each token. For tokens that are excessively imbalanced, it defines how much ETH of that token should be purchased in order to rebalance the ETF.

Once the ETF is balanced, I use the sent ETH to purchase the Tokens based on the newly calculated weight and mint an appropriate quantity of CryptoTokens.

## Future Developments
Possible future developments for the DynamicEtf smart contract might include:
- Making it clonable so that using the same model, more ETFs can be created with different Tokens.
- Moving the "calculateAmount" function externally to another smart contract, creating a standard interface so that this function can be customized by the user deploying the smart contract, thus providing the ability to create new mechanisms for balancing the ETF.
- Instead of recalculating the weight of each token with every call, you could set up a Chainlink Automation that runs at regular intervals, such as every hour or every day, and dynamically recalculates the token weights. This would significantly reduce the cost of Buy and Sell operations for users.

## Setup

1. Clone the repository.
2. Install dependencies with `npm install`.
3. Compile the contracts with `npx hardhat compile`.
4. Run tests with `npx hardhat test`.

## Deployment

To deploy the contracts, use the `deploy.js` script in the `scripts/` directory. You can run it with `npx hardhat run scripts/deploy.js`.
Since calling the functions consumes a high amount of gas I would deploy these smart contract in a blockchain like Polygon.
