require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config()
require("hardhat-gas-reporter");

module.exports = {
  solidity: {
    version:"0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      forking: {
        url: process.env.ALCHEMY_URL,
        blockNumber: 14660987
      }
    },
    dashboard: {
      url: "http://localhost:24012/rpc"
    }
  },
  gasReporter: {
    enabled: true,
    currency: 'EUR',
    coinmarketcap: '917e85f3-ecfe-4a70-a3bc-d743f90eb728'
  },
  etherscan: {
    apiKey: `39ZVGX8YRGN3ET8XWJ8GHMX1SSAVB61QFV`
  }
};
