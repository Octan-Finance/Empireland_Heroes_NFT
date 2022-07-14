const chai = require('chai');
const chaiAsPromise = require('chai-as-promised');
const { ethers } = require('hardhat');

chai.use(chaiAsPromise);
const expect = chai.expect;

describe('MultiSender Contract Testing', () => {
    let admin, users;
    let sender;
    let nft;
    
    before(async() => {
        [admin, ...users] = await ethers.getSigners();

        const MultiSender = await ethers.getContractFactory('MultiSender', admin);
        sender = await MultiSender.deploy();

        const Token721 = await ethers.getContractFactory('Token721', admin);
        nft = await Token721.deploy();

        let fromId = 0;
        let amount = 400;
        await nft.mint(users[0].address, fromId, amount);

        fromId = 400;
        amount = 100;
        await nft.mint(users[1].address, fromId, amount);
    });

    it('Should revert when Receivers and TokenIds are mismatched', async() => {
        const recipients = users.slice(2, 6).map((u) => u.address);
        const tokenIDs = [0, 1, 2];

        expect(await nft.ownerOf(tokenIDs[0])).deep.equal(users[0].address);
        expect(await nft.ownerOf(tokenIDs[1])).deep.equal(users[0].address);
        expect(await nft.ownerOf(tokenIDs[2])).deep.equal(users[0].address);

        await expect(
            sender.connect(users[0]).send(nft.address, users[0].address, recipients, tokenIDs)
        ).to.be.revertedWith('Length mismatch');

        expect(await nft.ownerOf(tokenIDs[0])).deep.equal(users[0].address);
        expect(await nft.ownerOf(tokenIDs[1])).deep.equal(users[0].address);
        expect(await nft.ownerOf(tokenIDs[2])).deep.equal(users[0].address);
    });

    it('Should revert when Distributor yet not setApprovalForAll', async() => {
        const recipients = users.slice(2, 7).map((u) => u.address);
        const tokenIDs = [0, 1, 2, 3, 4];

        expect(await nft.ownerOf(tokenIDs[0])).deep.equal(users[0].address);
        expect(await nft.ownerOf(tokenIDs[1])).deep.equal(users[0].address);
        expect(await nft.ownerOf(tokenIDs[2])).deep.equal(users[0].address);
        expect(await nft.ownerOf(tokenIDs[3])).deep.equal(users[0].address);
        expect(await nft.ownerOf(tokenIDs[4])).deep.equal(users[0].address);

        await expect(
            sender.connect(users[0]).send(nft.address, users[0].address, recipients, tokenIDs)
        ).to.be.revertedWith('ERC721: caller is not token owner nor approved');

        expect(await nft.ownerOf(tokenIDs[0])).deep.equal(users[0].address);
        expect(await nft.ownerOf(tokenIDs[1])).deep.equal(users[0].address);
        expect(await nft.ownerOf(tokenIDs[2])).deep.equal(users[0].address);
        expect(await nft.ownerOf(tokenIDs[3])).deep.equal(users[0].address);
        expect(await nft.ownerOf(tokenIDs[4])).deep.equal(users[0].address);
    });

    it('Should revert when Distributor sends items that owned by another Distributor', async() => {
        const recipients = users.slice(2, 7).map((u) => u.address);
        const tokenIDs = [400, 401, 402, 403, 404];

        await nft.connect(users[0]).setApprovalForAll(sender.address, true);

        expect(await nft.ownerOf(tokenIDs[0])).deep.equal(users[1].address);
        expect(await nft.ownerOf(tokenIDs[1])).deep.equal(users[1].address);
        expect(await nft.ownerOf(tokenIDs[2])).deep.equal(users[1].address);
        expect(await nft.ownerOf(tokenIDs[3])).deep.equal(users[1].address);
        expect(await nft.ownerOf(tokenIDs[4])).deep.equal(users[1].address);

        await expect(
            sender.connect(users[0]).send(nft.address, users[0].address, recipients, tokenIDs)
        ).to.be.revertedWith('ERC721: caller is not token owner nor approved');

        expect(await nft.ownerOf(tokenIDs[0])).deep.equal(users[1].address);
        expect(await nft.ownerOf(tokenIDs[1])).deep.equal(users[1].address);
        expect(await nft.ownerOf(tokenIDs[2])).deep.equal(users[1].address);
        expect(await nft.ownerOf(tokenIDs[3])).deep.equal(users[1].address);
        expect(await nft.ownerOf(tokenIDs[4])).deep.equal(users[1].address);
    });

    it('Should revert when Distributor sends items that owned by another Distributor', async() => {
        const recipients = users.slice(2, 7).map((u) => u.address);
        const tokenIDs = [0, 1, 2, 3, 400];

        await nft.connect(users[0]).setApprovalForAll(sender.address, true);

        expect(await nft.ownerOf(tokenIDs[0])).deep.equal(users[0].address);
        expect(await nft.ownerOf(tokenIDs[1])).deep.equal(users[0].address);
        expect(await nft.ownerOf(tokenIDs[2])).deep.equal(users[0].address);
        expect(await nft.ownerOf(tokenIDs[3])).deep.equal(users[0].address);
        expect(await nft.ownerOf(tokenIDs[4])).deep.equal(users[1].address);

        await expect(
            sender.connect(users[0]).send(nft.address, users[0].address, recipients, tokenIDs)
        ).to.be.revertedWith('ERC721: caller is not token owner nor approved');

        expect(await nft.ownerOf(tokenIDs[0])).deep.equal(users[0].address);
        expect(await nft.ownerOf(tokenIDs[1])).deep.equal(users[0].address);
        expect(await nft.ownerOf(tokenIDs[2])).deep.equal(users[0].address);
        expect(await nft.ownerOf(tokenIDs[3])).deep.equal(users[0].address);
        expect(await nft.ownerOf(tokenIDs[4])).deep.equal(users[1].address);
    });

    it('Should succeed when Distributor make a transfer to multiple Receivers', async() => {
        const recipients = users.slice(2, 7).map((u) => u.address);
        const tokenIDs = [0, 1, 2, 3, 4];

        expect(await nft.ownerOf(tokenIDs[0])).deep.equal(users[0].address);
        expect(await nft.ownerOf(tokenIDs[1])).deep.equal(users[0].address);
        expect(await nft.ownerOf(tokenIDs[2])).deep.equal(users[0].address);
        expect(await nft.ownerOf(tokenIDs[3])).deep.equal(users[0].address);
        expect(await nft.ownerOf(tokenIDs[4])).deep.equal(users[0].address);

        await sender.connect(users[0]).send(nft.address, users[0].address, recipients, tokenIDs)

        expect(await nft.ownerOf(tokenIDs[0])).deep.equal(users[2].address);
        expect(await nft.ownerOf(tokenIDs[1])).deep.equal(users[3].address);
        expect(await nft.ownerOf(tokenIDs[2])).deep.equal(users[4].address);
        expect(await nft.ownerOf(tokenIDs[3])).deep.equal(users[5].address);
        expect(await nft.ownerOf(tokenIDs[4])).deep.equal(users[6].address);
    });

    it('Should revert when Distributor re-send items that has been transferred', async() => {
        const recipients = users.slice(2, 7).map((u) => u.address);
        const tokenIDs = [0, 1, 2, 3, 4];

        expect(await nft.ownerOf(tokenIDs[0])).deep.equal(users[2].address);
        expect(await nft.ownerOf(tokenIDs[1])).deep.equal(users[3].address);
        expect(await nft.ownerOf(tokenIDs[2])).deep.equal(users[4].address);
        expect(await nft.ownerOf(tokenIDs[3])).deep.equal(users[5].address);
        expect(await nft.ownerOf(tokenIDs[4])).deep.equal(users[6].address);

        await expect(
            sender.connect(users[0]).send(nft.address, users[0].address, recipients, tokenIDs)
        ).to.be.revertedWith('ERC721: caller is not token owner nor approved');

        expect(await nft.ownerOf(tokenIDs[0])).deep.equal(users[2].address);
        expect(await nft.ownerOf(tokenIDs[1])).deep.equal(users[3].address);
        expect(await nft.ownerOf(tokenIDs[2])).deep.equal(users[4].address);
        expect(await nft.ownerOf(tokenIDs[3])).deep.equal(users[5].address);
        expect(await nft.ownerOf(tokenIDs[4])).deep.equal(users[6].address);
    });

    it('Should revert when Distributor re-send items that has been transferred', async() => {
        const recipients = users.slice(2, 7).map((u) => u.address);
        const tokenIDs = [5, 6, 7, 8, 0];

        expect(await nft.ownerOf(tokenIDs[0])).deep.equal(users[0].address);
        expect(await nft.ownerOf(tokenIDs[1])).deep.equal(users[0].address);
        expect(await nft.ownerOf(tokenIDs[2])).deep.equal(users[0].address);
        expect(await nft.ownerOf(tokenIDs[3])).deep.equal(users[0].address);
        expect(await nft.ownerOf(tokenIDs[4])).deep.equal(users[2].address);

        await expect(
            sender.connect(users[0]).send(nft.address, users[0].address, recipients, tokenIDs)
        ).to.be.revertedWith('ERC721: caller is not token owner nor approved');

        expect(await nft.ownerOf(tokenIDs[0])).deep.equal(users[0].address);
        expect(await nft.ownerOf(tokenIDs[1])).deep.equal(users[0].address);
        expect(await nft.ownerOf(tokenIDs[2])).deep.equal(users[0].address);
        expect(await nft.ownerOf(tokenIDs[3])).deep.equal(users[0].address);
        expect(await nft.ownerOf(tokenIDs[4])).deep.equal(users[2].address);
    });

    it('Should succeed when Distributor make a transfer multiple items to one Receiver', async() => {
        const recipients = [
            users[2].address, users[2].address, users[2].address, users[2].address, users[2].address
        ]
        const tokenIDs = [5, 6, 7, 8, 9];

        expect(await nft.ownerOf(tokenIDs[0])).deep.equal(users[0].address);
        expect(await nft.ownerOf(tokenIDs[1])).deep.equal(users[0].address);
        expect(await nft.ownerOf(tokenIDs[2])).deep.equal(users[0].address);
        expect(await nft.ownerOf(tokenIDs[3])).deep.equal(users[0].address);
        expect(await nft.ownerOf(tokenIDs[4])).deep.equal(users[0].address);

        await sender.connect(users[0]).send(nft.address, users[0].address, recipients, tokenIDs)
        
        expect(await nft.ownerOf(tokenIDs[0])).deep.equal(users[2].address);
        expect(await nft.ownerOf(tokenIDs[1])).deep.equal(users[2].address);
        expect(await nft.ownerOf(tokenIDs[2])).deep.equal(users[2].address);
        expect(await nft.ownerOf(tokenIDs[3])).deep.equal(users[2].address);
        expect(await nft.ownerOf(tokenIDs[4])).deep.equal(users[2].address);
    });

    it('Should succeed when Distributor transfers only one item to the Receiver', async() => {
        const recipients = [ users[2].address ]
        const tokenIDs = [10];

        expect(await nft.ownerOf(tokenIDs[0])).deep.equal(users[0].address);

        await sender.connect(users[0]).send(nft.address, users[0].address, recipients, tokenIDs)
        
        expect(await nft.ownerOf(tokenIDs[0])).deep.equal(users[2].address);
    });


});