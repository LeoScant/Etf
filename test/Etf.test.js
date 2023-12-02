// const { expect } = require("chai");
// const { ethers } = require("hardhat");
// const { provider } = ethers;
// const ERC20ABI = require('./ERC20.json');
// const helpers = require("@nomicfoundation/hardhat-toolbox/network-helpers");

// describe("Etf", function () {
//     let Etf, PriceConsumerV3;
//     let etf, priceConsumerV3;
//     let owner, addr1;
//     const LinkSymbol = "LINK";
//     const EthLinkOracleAddress = "0xdc530d9457755926550b59e8eccdae7624181557";
//     const LinkContractAddress = "0x514910771AF9Ca656af840dff83E8264EcF986CA";
//     const DAISymbol = "DAI";
//     const EthDAIOracleAddress = "0x773616e4d11a78f511299002da57a0a94577f1f4";
//     const DaiContractAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
//     const UniSymbol = "UNI";
//     const EthUniOracleAddress = "0xd6aa3d25116d8da79ea0246c4826eb951872e02e";
//     const UniContractAddress = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";
//     const CompSymbol = "COMP";
//     const EthCompOracleAddress = "0x1b39ee86ec5979ba5c322b826b3ecb8c79991699";
//     const CompoundContractAddress = "0xc00e94Cb662C3520282E6f5717214004A7f26888";

//     beforeEach(async function () {
        
//         // Imposta il timestamp del prossimo blocco a un anno fa
//         await ethers.provider.send('evm_setNextBlockTimestamp', [Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60]);
//         [owner, addr1] = await ethers.getSigners();

//         Etf = await ethers.getContractFactory("Etf");
//         etf = await Etf.deploy();

//         PriceConsumerV3 = await ethers.getContractFactory("PriceConsumerV3");
//         priceConsumerV3 = await PriceConsumerV3.deploy(EthLinkOracleAddress);
//     });

//     it("add all crypto tokens and rebalance", async function () {
//         await etf.addCryptoToken(LinkSymbol, LinkContractAddress, EthLinkOracleAddress);
//         await etf.addCryptoToken(DAISymbol, DaiContractAddress, EthDAIOracleAddress);
//         await etf.addCryptoToken(UniSymbol, UniContractAddress, EthUniOracleAddress);
//         await etf.addCryptoToken(CompSymbol, CompoundContractAddress, EthCompOracleAddress);
    
//         await etf.buyToken({value: 1000000000})
//         const LINK = new ethers.Contract(LinkContractAddress, ERC20ABI, provider);
//         LINKBalance = await LINK.balanceOf(await etf.getAddress());

//         const DAI = new ethers.Contract(DaiContractAddress, ERC20ABI, provider);
//         DAIBalance = await DAI.balanceOf(await etf.getAddress());

//         const UNI = new ethers.Contract(UniContractAddress, ERC20ABI, provider);
//         UNIBalance = await UNI.balanceOf(await etf.getAddress());

//         const COMP = new ethers.Contract(CompoundContractAddress, ERC20ABI, provider);
//         COMPBalance = await COMP.balanceOf(await etf.getAddress());

//         console.log(await etf.getTokens())
//         console.log('LINK: ',LINKBalance)
//         console.log('DAI: ',DAIBalance)
//         console.log('UNI: ',UNIBalance)
//         console.log('COMP: ',COMPBalance)
//         await etf.buyToken({value: 3000000})

//         console.log(await etf.balanceOf(owner))
//     });
// });