const { expect } = require("chai");
const { ethers } = require("hardhat");
const { provider } = ethers;
const ERC20ABI = require('./ERC20.json');

const fromWei = (x) => ethers.formatEther(x);
const toWei = (x) => ethers.parseEther(x.toString());

describe("StaticEtf", function () {
    let StaticEtf, staticEtf;
    let owner, addr1, addr2, addr3, addr4, addr5, addr6, addr7, addr8, addr9, addr10;
    let PriceConsumerV3, priceConsumerV3LINK, priceConsumerV3DAI, priceConsumerV3UNI, priceConsumerV3COMP;

    const LinkSymbol = "LINK";
    const EthLinkOracleAddress = "0xdc530d9457755926550b59e8eccdae7624181557";
    const LinkContractAddress = "0x514910771AF9Ca656af840dff83E8264EcF986CA";
    const DAISymbol = "DAI";
    const EthDAIOracleAddress = "0x773616e4d11a78f511299002da57a0a94577f1f4";
    const DaiContractAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
    const UniSymbol = "UNI";
    const EthUniOracleAddress = "0xd6aa3d25116d8da79ea0246c4826eb951872e02e";
    const UniContractAddress = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";
    const CompSymbol = "COMP";
    const EthCompOracleAddress = "0x1b39ee86ec5979ba5c322b826b3ecb8c79991699";
    const CompoundContractAddress = "0xc00e94Cb662C3520282E6f5717214004A7f26888";

    const CryptoTokens = [
        {
            symbol: LinkSymbol,
            weight: 10,
            tokenContract: LinkContractAddress
        },
        {
            symbol: DAISymbol,
            weight: 30,
            tokenContract: DaiContractAddress
        },
        {
            symbol: UniSymbol,
            weight: 100,
            tokenContract: UniContractAddress
        },
        {
            symbol: CompSymbol,
            weight: 75,
            tokenContract: CompoundContractAddress
        }
    ]

    beforeEach(async function () {
        [owner, addr1, addr2, addr3, addr4, addr5, addr6, addr7, addr8, addr9, addr10] = await ethers.getSigners();
        StaticEtf = await ethers.getContractFactory("StaticEtf");
        staticEtf = await StaticEtf.deploy(CryptoTokens);

    });

    it("buy tokens", async function () {
        const LINK = new ethers.Contract(LinkContractAddress, ERC20ABI, provider);
        const DAI = new ethers.Contract(DaiContractAddress, ERC20ABI, provider);
        const UNI = new ethers.Contract(UniContractAddress, ERC20ABI, provider);
        const COMP = new ethers.Contract(CompoundContractAddress, ERC20ABI, provider);

        PriceConsumerV3 = await ethers.getContractFactory("PriceConsumerV3");
        priceConsumerV3LINK = await PriceConsumerV3.deploy(EthLinkOracleAddress);
        priceConsumerV3DAI = await PriceConsumerV3.deploy(EthDAIOracleAddress);
        priceConsumerV3UNI = await PriceConsumerV3.deploy(EthUniOracleAddress);
        priceConsumerV3COMP = await PriceConsumerV3.deploy(EthCompOracleAddress);

        const LINKPrice = fromWei(await priceConsumerV3LINK.getLatestPrice());
        const DAIPrice = fromWei(await priceConsumerV3DAI.getLatestPrice());
        const UNIPrice = fromWei(await priceConsumerV3UNI.getLatestPrice());
        const COMPPrice = fromWei(await priceConsumerV3COMP.getLatestPrice());

        LINKBalance = fromWei(await LINK.balanceOf(await staticEtf.getAddress()));
        DAIBalance = fromWei(await DAI.balanceOf(await staticEtf.getAddress()));
        UNIBalance = fromWei(await UNI.balanceOf(await staticEtf.getAddress()));
        COMPBalance = fromWei(await COMP.balanceOf(await staticEtf.getAddress()));

        let Total = (LINKPrice * Number(LINKBalance)) + (Number(DAIPrice) * Number(DAIBalance)) + (Number(UNIPrice) * Number(UNIBalance)) + (Number(COMPPrice) * Number(COMPBalance))

        await staticEtf.connect(owner).buyToken({ value: toWei(20) })
        console.log('OWNER: ', fromWei(await staticEtf.balanceOf(owner)))

        LINKBalance = fromWei(await LINK.balanceOf(await staticEtf.getAddress()));
        DAIBalance = fromWei(await DAI.balanceOf(await staticEtf.getAddress()));
        UNIBalance = fromWei(await UNI.balanceOf(await staticEtf.getAddress()));
        COMPBalance = fromWei(await COMP.balanceOf(await staticEtf.getAddress()));

        Total = (LINKPrice * Number(LINKBalance)) + (Number(DAIPrice) * Number(DAIBalance)) + (Number(UNIPrice) * Number(UNIBalance)) + (Number(COMPPrice) * Number(COMPBalance))

        //log balance and ETH Value of each token
        console.log('LINK Balance:',LINKBalance)
        console.log('LINK Value:',LINKPrice * Number(LINKBalance))
        console.log('Link %:',LINKPrice * Number(LINKBalance) / Total)
        console.log('DAI Balance:',DAIBalance)
        console.log('DAI Value:',DAIPrice * Number(DAIBalance))
        console.log('DAI %:',DAIPrice * Number(DAIBalance) / Total)
        console.log('UNI Balance:',UNIBalance)
        console.log('UNI Value:',UNIPrice * Number(UNIBalance))
        console.log('UNI %:',UNIPrice * Number(UNIBalance) / Total)
        console.log('COMP Balance:',COMPBalance)
        console.log('COMP Value:',COMPPrice * Number(COMPBalance))
        console.log('COMP %:',COMPPrice * Number(COMPBalance) / Total)
        //log total in ETH
        console.log('Total:',Total)

    });

    it("sell tokens", async function () {
        const LINK = new ethers.Contract(LinkContractAddress, ERC20ABI, provider);
        const DAI = new ethers.Contract(DaiContractAddress, ERC20ABI, provider);
        const UNI = new ethers.Contract(UniContractAddress, ERC20ABI, provider);
        const COMP = new ethers.Contract(CompoundContractAddress, ERC20ABI, provider);

        const LINKPrice = fromWei(await priceConsumerV3LINK.getLatestPrice());
        const DAIPrice = fromWei(await priceConsumerV3DAI.getLatestPrice());
        const UNIPrice = fromWei(await priceConsumerV3UNI.getLatestPrice());
        const COMPPrice = fromWei(await priceConsumerV3COMP.getLatestPrice());
        //every addr buys 20 ETH worth of tokens
        await staticEtf.connect(owner).buyToken({ value: toWei(10) })
        await staticEtf.connect(addr1).buyToken({ value: toWei(10) })
        await staticEtf.connect(addr2).buyToken({ value: toWei(10) })
        await staticEtf.connect(addr3).buyToken({ value: toWei(10) })
        await staticEtf.connect(addr4).buyToken({ value: toWei(10) })
        await staticEtf.connect(addr5).buyToken({ value: toWei(10) })
        await staticEtf.connect(addr6).buyToken({ value: toWei(10) })
        await staticEtf.connect(addr7).buyToken({ value: toWei(10) })
        await staticEtf.connect(addr8).buyToken({ value: toWei(10) })
        await staticEtf.connect(addr9).buyToken({ value: toWei(10) })
        await staticEtf.connect(addr10).buyToken({ value: toWei(10) })


        // get all the addresses tokens balances
        const ownerTokens = await staticEtf.balanceOf(owner)
        const addr1Tokens = await staticEtf.balanceOf(addr1)
        const addr2Tokens = await staticEtf.balanceOf(addr2)
        const addr3Tokens = await staticEtf.balanceOf(addr3)
        const addr4Tokens = await staticEtf.balanceOf(addr4)
        const addr5Tokens = await staticEtf.balanceOf(addr5)
        const addr6Tokens = await staticEtf.balanceOf(addr6)
        const addr7Tokens = await staticEtf.balanceOf(addr7)
        const addr8Tokens = await staticEtf.balanceOf(addr8)
        const addr9Tokens = await staticEtf.balanceOf(addr9)
        const addr10Tokens = await staticEtf.balanceOf(addr10)

        console.log('OWNER: ', fromWei(ownerTokens))
        console.log('ADDR1: ', fromWei(addr1Tokens))
        console.log('ADDR2: ', fromWei(addr2Tokens))
        console.log('ADDR3: ', fromWei(addr3Tokens))
        console.log('ADDR4: ', fromWei(addr4Tokens))
        console.log('ADDR5: ', fromWei(addr5Tokens))
        console.log('ADDR6: ', fromWei(addr6Tokens))
        console.log('ADDR7: ', fromWei(addr7Tokens))
        console.log('ADDR8: ', fromWei(addr8Tokens))
        console.log('ADDR9: ', fromWei(addr9Tokens))
        console.log('ADDR10: ', fromWei(addr10Tokens))
        
        let LINKBalance = fromWei(await LINK.balanceOf(await staticEtf.getAddress()));
        let DAIBalance = fromWei(await DAI.balanceOf(await staticEtf.getAddress()));
        let UNIBalance = fromWei(await UNI.balanceOf(await staticEtf.getAddress()));
        let COMPBalance = fromWei(await COMP.balanceOf(await staticEtf.getAddress()));
        console.log('LINK Balance:',LINKBalance)
        console.log('DAI Balance:',DAIBalance)
        console.log('UNI Balance:',UNIBalance)
        console.log('COMP Balance:',COMPBalance)

        let Total = (LINKPrice * Number(LINKBalance)) + (Number(DAIPrice) * Number(DAIBalance)) + (Number(UNIPrice) * Number(UNIBalance)) + (Number(COMPPrice) * Number(COMPBalance))
        console.log('Total:',Total)

        const amountOwnerBefore = await provider.getBalance(owner)
        await staticEtf.connect(owner).sellToken(ownerTokens)
        const amountOwnerAfter = await provider.getBalance(owner)
        console.log('OWNER: ', fromWei(amountOwnerAfter - amountOwnerBefore))

        const amountAddr1Before = await provider.getBalance(addr1)
        await staticEtf.connect(addr1).sellToken(addr1Tokens)
        const amountAddr1After = await provider.getBalance(addr1)
        console.log('ADDR1: ', fromWei(amountAddr1After - amountAddr1Before))
        
        const amountAddr2Before = await provider.getBalance(addr2)
        await staticEtf.connect(addr2).sellToken(addr2Tokens)
        const amountAddr2After = await provider.getBalance(addr2)
        console.log('ADDR2: ', fromWei(amountAddr2After - amountAddr2Before))

        const amountAddr3Before = await provider.getBalance(addr3)
        await staticEtf.connect(addr3).sellToken(addr3Tokens)
        const amountAddr3After = await provider.getBalance(addr3)
        console.log('ADDR3: ', fromWei(amountAddr3After - amountAddr3Before))

        const amountAddr4Before = await provider.getBalance(addr4)
        await staticEtf.connect(addr4).sellToken(addr4Tokens)
        const amountAddr4After = await provider.getBalance(addr4)
        console.log('ADDR4: ', fromWei(amountAddr4After - amountAddr4Before))

        const amountAddr5Before = await provider.getBalance(addr5)
        await staticEtf.connect(addr5).sellToken(addr5Tokens)
        const amountAddr5After = await provider.getBalance(addr5)
        console.log('ADDR5: ', fromWei(amountAddr5After - amountAddr5Before))
        
        const amountAddr6Before = await provider.getBalance(addr6)
        await staticEtf.connect(addr6).sellToken(addr6Tokens)
        const amountAddr6After = await provider.getBalance(addr6)
        console.log('ADDR6: ', fromWei(amountAddr6After - amountAddr6Before))

        const amountAddr7Before = await provider.getBalance(addr7)
        await staticEtf.connect(addr7).sellToken(addr7Tokens)
        const amountAddr7After = await provider.getBalance(addr7)
        console.log('ADDR7: ', fromWei(amountAddr7After - amountAddr7Before))

        const amountAddr8Before = await provider.getBalance(addr8)
        await staticEtf.connect(addr8).sellToken(addr8Tokens)
        const amountAddr8After = await provider.getBalance(addr8)
        console.log('ADDR8: ', fromWei(amountAddr8After - amountAddr8Before))

        const amountAddr9Before = await provider.getBalance(addr9)
        await staticEtf.connect(addr9).sellToken(addr9Tokens)
        const amountAddr9After = await provider.getBalance(addr9)
        console.log('ADDR9: ', fromWei(amountAddr9After - amountAddr9Before))

        LINKBalance = fromWei(await LINK.balanceOf(await staticEtf.getAddress()));
        DAIBalance = fromWei(await DAI.balanceOf(await staticEtf.getAddress()));
        UNIBalance = fromWei(await UNI.balanceOf(await staticEtf.getAddress()));
        COMPBalance = fromWei(await COMP.balanceOf(await staticEtf.getAddress()));
        console.log('LINK Balance:',LINKBalance)
        console.log('DAI Balance:',DAIBalance)
        console.log('UNI Balance:',UNIBalance)
        console.log('COMP Balance:',COMPBalance)

        const amountAddr10Before = await provider.getBalance(addr10)
        await staticEtf.connect(addr10).sellToken(addr10Tokens)
        const amountAddr10After = await provider.getBalance(addr10)
        console.log('ADDR10: ', fromWei(amountAddr10After - amountAddr10Before))

        LINKBalance = fromWei(await LINK.balanceOf(await staticEtf.getAddress()));
        DAIBalance = fromWei(await DAI.balanceOf(await staticEtf.getAddress()));
        UNIBalance = fromWei(await UNI.balanceOf(await staticEtf.getAddress()));
        COMPBalance = fromWei(await COMP.balanceOf(await staticEtf.getAddress()));
        console.log('LINK Balance:',LINKBalance)
        console.log('DAI Balance:',DAIBalance)
        console.log('UNI Balance:',UNIBalance)
        console.log('COMP Balance:',COMPBalance)

    });
});