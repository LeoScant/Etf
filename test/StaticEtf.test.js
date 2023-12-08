const { expect } = require("chai");
const { ethers } = require("hardhat");
const { provider } = ethers;
const ERC20ABI = require('./ERC20.json');

const fromWei = (x) => ethers.formatEther(x);
const toWei = (x) => ethers.parseEther(x.toString());

describe("StaticEtf", function () {
    let StaticEtf, staticEtf, staticEtfAddress;;
    let owner, user1, user2;
    let user1Address, user2Address;
    let PriceConsumerV3, priceConsumerV3LINK, priceConsumerV3DAI, priceConsumerV3UNI, priceConsumerV3COMP;
    let LINKPrice, DAIPrice, UNIPrice, COMPPrice;

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

    const LINK = new ethers.Contract(LinkContractAddress, ERC20ABI, provider);
    const DAI = new ethers.Contract(DaiContractAddress, ERC20ABI, provider);
    const UNI = new ethers.Contract(UniContractAddress, ERC20ABI, provider);
    const COMP = new ethers.Contract(CompoundContractAddress, ERC20ABI, provider);

    const ETHSpentAddr1 = 20;
    const ETHSpentAddr2 = 50;

    it("Should return the right name and symbol", async function () {
        [owner, user1, user2] = await ethers.getSigners();
        user1Address = await user1.getAddress();
        user2Address = await user2.getAddress();

        StaticEtf = await ethers.getContractFactory("StaticEtf");
        staticEtf = await StaticEtf.deploy(CryptoTokens);
        staticEtfAddress = await staticEtf.getAddress();

        PriceConsumerV3 = await ethers.getContractFactory("PriceConsumerV3");
        priceConsumerV3LINK = await PriceConsumerV3.deploy(EthLinkOracleAddress);
        priceConsumerV3DAI = await PriceConsumerV3.deploy(EthDAIOracleAddress);
        priceConsumerV3UNI = await PriceConsumerV3.deploy(EthUniOracleAddress);
        priceConsumerV3COMP = await PriceConsumerV3.deploy(EthCompOracleAddress);

        // Get the latest price for each token
        LINKPrice = fromWei(await priceConsumerV3LINK.getLatestPrice());
        DAIPrice = fromWei(await priceConsumerV3DAI.getLatestPrice());
        UNIPrice = fromWei(await priceConsumerV3UNI.getLatestPrice());
        COMPPrice = fromWei(await priceConsumerV3COMP.getLatestPrice());

        expect(await staticEtf.name()).to.equal("CryptoETF");
        expect(await staticEtf.symbol()).to.equal("CETF");
    });

    it("Users buy tokens", async function () {
        // Buy tokens with ETH for addr1
        const tx1 = await staticEtf.connect(user1).buyToken({ value: toWei(ETHSpentAddr1) })
        
        // Check that the contract has the right amount of tokens
        const LINKBalance = await LINK.balanceOf(staticEtfAddress);
        await expect(tx1).to.changeTokenBalance(LINK, staticEtfAddress, LINKBalance)
        await expect(tx1).to.emit(staticEtf, 'TokenBought').withArgs(LinkSymbol, LINKBalance)

        const DAIBalance = await DAI.balanceOf(staticEtfAddress);
        await expect(tx1).to.changeTokenBalance(DAI, staticEtfAddress, DAIBalance)
        await expect(tx1).to.emit(staticEtf, 'TokenBought').withArgs(DAISymbol, DAIBalance)

        const UNIBalance = await UNI.balanceOf(staticEtfAddress);
        await expect(tx1).to.changeTokenBalance(UNI, staticEtfAddress, UNIBalance)
        await expect(tx1).to.emit(staticEtf, 'TokenBought').withArgs(UniSymbol, UNIBalance)

        const COMPBalance = await COMP.balanceOf(staticEtfAddress);
        await expect(tx1).to.changeTokenBalance(COMP, staticEtfAddress, COMPBalance)
        await expect(tx1).to.emit(staticEtf, 'TokenBought').withArgs(CompSymbol, COMPBalance)

        const cryptoTokensMinted1 = LINKBalance + DAIBalance + UNIBalance + COMPBalance
        const cryptoTokensBalance1 = await staticEtf.balanceOf(user1Address)
        await expect(tx1).to.emit(staticEtf, 'CryptoTokenMinted').withArgs(user1Address, cryptoTokensMinted1)
        expect(cryptoTokensBalance1).to.equal(cryptoTokensMinted1)

        // Check that the contract has the right amount of ETH
        const TokensValue1 = 
            (LINKPrice * Number(LINKBalance)) +
            (DAIPrice * Number(DAIBalance)) +
            (UNIPrice * Number(UNIBalance)) +
            (COMPPrice * Number(COMPBalance))
        const fees1 = ETHSpentAddr1 * 3 / 1000;
        expect(TokensValue1).to.be.closeTo(Number(toWei(ETHSpentAddr1 - fees1)), Number(toWei(0.05)));

        // Buy tokens with ETH for addr2
        const tx2 = await staticEtf.connect(user2).buyToken({ value: toWei(ETHSpentAddr2) })
        
        // Check that the contract has the right amount of tokens
        const LINKBalance2 = await LINK.balanceOf(staticEtfAddress) - LINKBalance;
        await expect(tx2).to.changeTokenBalance(LINK, staticEtfAddress, LINKBalance2)
        await expect(tx2).to.emit(staticEtf, 'TokenBought').withArgs(LinkSymbol, LINKBalance2)

        const DAIBalance2 = await DAI.balanceOf(staticEtfAddress) - DAIBalance;
        await expect(tx2).to.changeTokenBalance(DAI, staticEtfAddress, DAIBalance2)
        await expect(tx2).to.emit(staticEtf, 'TokenBought').withArgs(DAISymbol, DAIBalance2)

        const UNIBalance2 = await UNI.balanceOf(staticEtfAddress) - UNIBalance;
        await expect(tx2).to.changeTokenBalance(UNI, staticEtfAddress, UNIBalance2)
        await expect(tx2).to.emit(staticEtf, 'TokenBought').withArgs(UniSymbol, UNIBalance2)

        const COMPBalance2 = await COMP.balanceOf(staticEtfAddress) - COMPBalance;
        await expect(tx2).to.changeTokenBalance(COMP, staticEtfAddress, COMPBalance2)
        await expect(tx2).to.emit(staticEtf, 'TokenBought').withArgs(CompSymbol, COMPBalance2)

        const cryptoTokensMinted2 = LINKBalance2 + DAIBalance2 + UNIBalance2 + COMPBalance2
        const cryptoTokensBalance2 = await staticEtf.balanceOf(user2Address)
        await expect(tx2).to.emit(staticEtf, 'CryptoTokenMinted').withArgs(user2Address, cryptoTokensMinted2)
        expect(cryptoTokensBalance2).to.equal(cryptoTokensMinted2)

        // Check that the contract has the right amount of ETH
        const TokensValue2 =
            (LINKPrice * Number(LINKBalance2)) +
            (DAIPrice * Number(DAIBalance2)) +
            (UNIPrice * Number(UNIBalance2)) +
            (COMPPrice * Number(COMPBalance2))
        const fees2 = ETHSpentAddr2 * 3 / 1000;
        expect(TokensValue2).to.be.closeTo(Number(toWei(ETHSpentAddr2 - fees2)), Number(toWei(0.2)));

        // Check that the fees earned are correct
        const contractBalance = Number(await provider.getBalance(staticEtfAddress));
        expect(contractBalance).to.be.equal(Number(toWei(fees1 + fees2)));
    });

    it("Users sell tokens", async function () {
        // Get the balances of each token before selling
        const LINKBalanceBefore = await LINK.balanceOf(staticEtfAddress);
        const DAIBalanceBefore = await DAI.balanceOf(staticEtfAddress);
        const UNIBalanceBefore = await UNI.balanceOf(staticEtfAddress);
        const COMPBalanceBefore = await COMP.balanceOf(staticEtfAddress);

        const contractBalanceBefore = Number(await provider.getBalance(staticEtfAddress));
        const user1BalanceBefore = Number(await provider.getBalance(user1Address));
        const user2BalanceBefore = Number(await provider.getBalance(user2Address));

        // Sell tokens for addr1
        const tokenToBurn = await staticEtf.balanceOf(user1Address)
        const tx1 = await staticEtf.connect(user1).sellToken(tokenToBurn)
        await expect(tx1).to.emit(staticEtf, 'CryptoTokenBurnt').withArgs(user1Address, tokenToBurn)

        const LINKBalanceAfter = await LINK.balanceOf(staticEtfAddress);
        const DAIBalanceAfter = await DAI.balanceOf(staticEtfAddress);
        const UNIBalanceAfter = await UNI.balanceOf(staticEtfAddress);
        const COMPBalanceAfter = await COMP.balanceOf(staticEtfAddress);

        //Sell tokens for addr2
        const tokenToBurn2 = await staticEtf.balanceOf(user2Address)
        const tx2 = await staticEtf.connect(user2).sellToken(tokenToBurn2)
        await expect(tx2).to.emit(staticEtf, 'CryptoTokenBurnt').withArgs(user2Address, tokenToBurn2)

        // Check that the contract has the right amount of tokens
        const LINKBalanceSold = LINKBalanceBefore - LINKBalanceAfter;
        await expect(tx1).to.changeTokenBalance(LINK, staticEtfAddress, -LINKBalanceSold)
        await expect(tx1).to.emit(staticEtf, 'TokenSold').withArgs(LinkSymbol, LINKBalanceSold)

        await expect(tx2).to.changeTokenBalance(LINK, staticEtfAddress, -LINKBalanceAfter)
        await expect(tx2).to.emit(staticEtf, 'TokenSold').withArgs(LinkSymbol, LINKBalanceAfter)

        const DAIBalanceSold = DAIBalanceBefore - DAIBalanceAfter;
        await expect(tx1).to.changeTokenBalance(DAI, staticEtfAddress, -DAIBalanceSold)
        await expect(tx1).to.emit(staticEtf, 'TokenSold').withArgs(DAISymbol, DAIBalanceSold)

        await expect(tx2).to.changeTokenBalance(DAI, staticEtfAddress, -DAIBalanceAfter)
        await expect(tx2).to.emit(staticEtf, 'TokenSold').withArgs(DAISymbol, DAIBalanceAfter)

        const UNIBalanceSold = UNIBalanceBefore - UNIBalanceAfter;
        await expect(tx1).to.changeTokenBalance(UNI, staticEtfAddress, -UNIBalanceSold)
        await expect(tx1).to.emit(staticEtf, 'TokenSold').withArgs(UniSymbol, UNIBalanceSold)

        await expect(tx2).to.changeTokenBalance(UNI, staticEtfAddress, -UNIBalanceAfter)
        await expect(tx2).to.emit(staticEtf, 'TokenSold').withArgs(UniSymbol, UNIBalanceAfter)

        const COMPBalanceSold = COMPBalanceBefore - COMPBalanceAfter;
        await expect(tx1).to.changeTokenBalance(COMP, staticEtfAddress, -COMPBalanceSold)
        await expect(tx1).to.emit(staticEtf, 'TokenSold').withArgs(CompSymbol, COMPBalanceSold)

        // check if EthSent event emitted
        await expect(tx1).to.emit(staticEtf, 'EthSent')

        await expect(tx2).to.changeTokenBalance(LINK, staticEtfAddress, -LINKBalanceAfter)
        await expect(tx2).to.emit(staticEtf, 'TokenSold').withArgs(LinkSymbol, LINKBalanceAfter)

        await expect(tx2).to.changeTokenBalance(DAI, staticEtfAddress, -DAIBalanceAfter)
        await expect(tx2).to.emit(staticEtf, 'TokenSold').withArgs(DAISymbol, DAIBalanceAfter)

        await expect(tx2).to.changeTokenBalance(UNI, staticEtfAddress, -UNIBalanceAfter)
        await expect(tx2).to.emit(staticEtf, 'TokenSold').withArgs(UniSymbol, UNIBalanceAfter)

        await expect(tx2).to.changeTokenBalance(COMP, staticEtfAddress, -COMPBalanceAfter)
        await expect(tx2).to.emit(staticEtf, 'TokenSold').withArgs(CompSymbol, COMPBalanceAfter)        
    });
});