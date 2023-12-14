const { expect } = require("chai");
const { ethers } = require("hardhat");
const { provider } = ethers;
const ERC20ABI = require('./ERC20.json');

const fromWei = (x) => ethers.formatEther(x);
const toWei = (x) => ethers.parseEther(x.toString());

describe("DynamicEtf", function () {
    let DynamicEtf, dynamicEtf, dynamicEtfAddress;
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
            tokenContract: LinkContractAddress,
            priceFeedAddress: EthLinkOracleAddress
        },
        {
            symbol: DAISymbol,
            tokenContract: DaiContractAddress,
            priceFeedAddress: EthDAIOracleAddress
        },
        {
            symbol: UniSymbol,
            tokenContract: UniContractAddress,
            priceFeedAddress: EthUniOracleAddress
        },
        {
            symbol: CompSymbol,
            tokenContract: CompoundContractAddress,
            priceFeedAddress: EthCompOracleAddress
        }
    ]

    const LINK = new ethers.Contract(LinkContractAddress, ERC20ABI, provider);
    const DAI = new ethers.Contract(DaiContractAddress, ERC20ABI, provider);
    const UNI = new ethers.Contract(UniContractAddress, ERC20ABI, provider);
    const COMP = new ethers.Contract(CompoundContractAddress, ERC20ABI, provider);

    const ETHSpentAddr1 = 20;
    const ETHSpentAddr2 = 50;
    
    const fees1 = ETHSpentAddr1 * 3 / 1000;
    const fees2 = ETHSpentAddr2 * 3 / 1000;

    it("Should return the right name and symbol", async function () {
        [owner, user1, user2] = await ethers.getSigners();
        user1Address = await user1.getAddress();
        user2Address = await user2.getAddress();

        DynamicEtf = await ethers.getContractFactory("DynamicEtf");
        dynamicEtf = await DynamicEtf.deploy(CryptoTokens);
        dynamicEtfAddress = await dynamicEtf.getAddress();

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

        expect(await dynamicEtf.name()).to.equal("CryptoETF");
        expect(await dynamicEtf.symbol()).to.equal("CETF");
    });

    it("Users buy tokens", async function () {
        // Buy tokens with ETH for addr1
        const tx1 = await dynamicEtf.connect(user1).buyToken({ value: toWei(ETHSpentAddr1) })
        
        // Check that the contract has the right amount of tokens
        const LINKBalance = await LINK.balanceOf(dynamicEtfAddress);
        await expect(tx1).to.changeTokenBalance(LINK, dynamicEtfAddress, LINKBalance)
        await expect(tx1).to.emit(dynamicEtf, 'TokenBought').withArgs(LinkSymbol, LINKBalance)

        const DAIBalance = await DAI.balanceOf(dynamicEtfAddress);
        await expect(tx1).to.changeTokenBalance(DAI, dynamicEtfAddress, DAIBalance)
        await expect(tx1).to.emit(dynamicEtf, 'TokenBought').withArgs(DAISymbol, DAIBalance)

        const UNIBalance = await UNI.balanceOf(dynamicEtfAddress);
        await expect(tx1).to.changeTokenBalance(UNI, dynamicEtfAddress, UNIBalance)
        await expect(tx1).to.emit(dynamicEtf, 'TokenBought').withArgs(UniSymbol, UNIBalance)

        const COMPBalance = await COMP.balanceOf(dynamicEtfAddress);
        await expect(tx1).to.changeTokenBalance(COMP, dynamicEtfAddress, COMPBalance)
        await expect(tx1).to.emit(dynamicEtf, 'TokenBought').withArgs(CompSymbol, COMPBalance)

        const cryptoTokensBalance1 = await dynamicEtf.balanceOf(user1Address)
        await expect(tx1).to.emit(dynamicEtf, 'CryptoTokenMinted').withArgs(user1Address, toWei(ETHSpentAddr1 - fees1))
        
        expect(cryptoTokensBalance1).to.equal(toWei(ETHSpentAddr1 - fees1))

        // Check that the contract has the right amount of ETH
        const TokensValue1 = 
            (LINKPrice * Number(LINKBalance)) +
            (DAIPrice * Number(DAIBalance)) +
            (UNIPrice * Number(UNIBalance)) +
            (COMPPrice * Number(COMPBalance))
        expect(TokensValue1).to.be.closeTo(Number(toWei(ETHSpentAddr1 - fees1)), Number(toWei(1)));

        // Buy tokens with ETH for addr2
        const totalSupply = await dynamicEtf.totalSupply()
        const tx2 = await dynamicEtf.connect(user2).buyToken({ value: toWei(ETHSpentAddr2) })
        
        // Check that the contract has the right amount of tokens
        const LINKBalance2 = await LINK.balanceOf(dynamicEtfAddress) - LINKBalance;
        await expect(tx2).to.changeTokenBalance(LINK, dynamicEtfAddress, LINKBalance2)
        await expect(tx2).to.emit(dynamicEtf, 'TokenBought').withArgs(LinkSymbol, LINKBalance2)

        const DAIBalance2 = await DAI.balanceOf(dynamicEtfAddress) - DAIBalance;
        await expect(tx2).to.changeTokenBalance(DAI, dynamicEtfAddress, DAIBalance2)
        await expect(tx2).to.emit(dynamicEtf, 'TokenBought').withArgs(DAISymbol, DAIBalance2)

        const UNIBalance2 = await UNI.balanceOf(dynamicEtfAddress) - UNIBalance;
        await expect(tx2).to.changeTokenBalance(UNI, dynamicEtfAddress, UNIBalance2)
        await expect(tx2).to.emit(dynamicEtf, 'TokenBought').withArgs(UniSymbol, UNIBalance2)

        const COMPBalance2 = await COMP.balanceOf(dynamicEtfAddress) - COMPBalance;
        await expect(tx2).to.changeTokenBalance(COMP, dynamicEtfAddress, COMPBalance2)
        await expect(tx2).to.emit(dynamicEtf, 'TokenBought').withArgs(CompSymbol, COMPBalance2)

        const cryptoTokensBalance2 = await dynamicEtf.balanceOf(user2Address)
        await expect(tx2).to.emit(dynamicEtf, 'CryptoTokenMinted').withArgs(user2Address, cryptoTokensBalance2)
    });

    it("Users sell tokens", async function () {
        // Get the balances of each token before selling
        const LINKBalanceBefore = await LINK.balanceOf(dynamicEtfAddress);
        const DAIBalanceBefore = await DAI.balanceOf(dynamicEtfAddress);
        const UNIBalanceBefore = await UNI.balanceOf(dynamicEtfAddress);
        const COMPBalanceBefore = await COMP.balanceOf(dynamicEtfAddress);

        // Sell tokens for addr1
        const tokenToBurn = await dynamicEtf.balanceOf(user1Address)
        const tx1 = await dynamicEtf.connect(user1).sellToken(tokenToBurn)
        await expect(tx1).to.emit(dynamicEtf, 'CryptoTokenBurnt').withArgs(user1Address, tokenToBurn)

        const LINKBalanceAfter = await LINK.balanceOf(dynamicEtfAddress);
        const DAIBalanceAfter = await DAI.balanceOf(dynamicEtfAddress);
        const UNIBalanceAfter = await UNI.balanceOf(dynamicEtfAddress);
        const COMPBalanceAfter = await COMP.balanceOf(dynamicEtfAddress);

        //Sell tokens for addr2
        const tokenToBurn2 = await dynamicEtf.balanceOf(user2Address)
        const tx2 = await dynamicEtf.connect(user2).sellToken(tokenToBurn2)
        await expect(tx2).to.emit(dynamicEtf, 'CryptoTokenBurnt').withArgs(user2Address, tokenToBurn2)

        const LINKBalanceEnd = await LINK.balanceOf(dynamicEtfAddress);
        const DAIBalanceEnd = await DAI.balanceOf(dynamicEtfAddress);
        const UNIBalanceEnd = await UNI.balanceOf(dynamicEtfAddress);
        const COMPBalanceEnd = await COMP.balanceOf(dynamicEtfAddress);

        // Check that the contract has the right amount of tokens
        const LINKBalanceSold1 = LINKBalanceBefore - LINKBalanceAfter;
        const LINKBalanceSold2 = LINKBalanceAfter - LINKBalanceEnd;
        await expect(tx1).to.changeTokenBalance(LINK, dynamicEtfAddress, -LINKBalanceSold1)
        await expect(tx1).to.emit(dynamicEtf, 'TokenSold').withArgs(LinkSymbol, LINKBalanceSold1)        

         await expect(tx2).to.changeTokenBalance(LINK, dynamicEtfAddress, -LINKBalanceSold2)
         await expect(tx2).to.emit(dynamicEtf, 'TokenSold').withArgs(LinkSymbol, LINKBalanceSold2)

        const DAIBalanceSold1 = DAIBalanceBefore - DAIBalanceAfter;
        const DAIBalanceSold2 = DAIBalanceAfter - DAIBalanceEnd;
        await expect(tx1).to.changeTokenBalance(DAI, dynamicEtfAddress, -DAIBalanceSold1)
        await expect(tx1).to.emit(dynamicEtf, 'TokenSold').withArgs(DAISymbol, DAIBalanceSold1)

        await expect(tx2).to.changeTokenBalance(DAI, dynamicEtfAddress, -DAIBalanceSold2)
        await expect(tx2).to.emit(dynamicEtf, 'TokenSold').withArgs(DAISymbol, DAIBalanceSold2)

        const UNIBalanceSold1 = UNIBalanceBefore - UNIBalanceAfter;
        const UNIBalanceSold2 = UNIBalanceAfter - UNIBalanceEnd;
        await expect(tx1).to.changeTokenBalance(UNI, dynamicEtfAddress, -UNIBalanceSold1)
        await expect(tx1).to.emit(dynamicEtf, 'TokenSold').withArgs(UniSymbol, UNIBalanceSold1)

        await expect(tx2).to.changeTokenBalance(UNI, dynamicEtfAddress, -UNIBalanceSold2)
        await expect(tx2).to.emit(dynamicEtf, 'TokenSold').withArgs(UniSymbol, UNIBalanceSold2)

        const COMPBalanceSold1 = COMPBalanceBefore - COMPBalanceAfter;
        const COMPBalanceSold2 = COMPBalanceAfter - COMPBalanceEnd;
        await expect(tx1).to.changeTokenBalance(COMP, dynamicEtfAddress, -COMPBalanceSold1)
        await expect(tx1).to.emit(dynamicEtf, 'TokenSold').withArgs(CompSymbol, COMPBalanceSold1)

        await expect(tx2).to.changeTokenBalance(COMP, dynamicEtfAddress, -COMPBalanceSold2)
        await expect(tx2).to.emit(dynamicEtf, 'TokenSold').withArgs(CompSymbol, COMPBalanceSold2)

        // check if EthSent event emitted
        await expect(tx1).to.emit(dynamicEtf, 'EthSent')
    });

    it("Owner withdraw ETH", async function () {
        const ethContractBalance = await provider.getBalance(dynamicEtfAddress);
        const tx = await dynamicEtf.connect(owner).withdraw();
        await expect(tx).to.changeEtherBalance(owner, ethContractBalance);
        expect(ethContractBalance).to.be.closeTo(toWei((fees1 + fees2)*2), toWei(0.01))
    });

    it("users can't withdraw ETH", async function () {
        await expect(dynamicEtf.connect(user1).withdraw()).to.be.revertedWithCustomError(dynamicEtf, "OwnableUnauthorizedAccount");
    });
});