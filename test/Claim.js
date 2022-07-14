const chai = require('chai');
const chaiAsPromise = require('chai-as-promised');
const { utils } = require('ethers');

chai.use(chaiAsPromise);
const expect = chai.expect;

function keccak256(data) {
    return utils.keccak256(data);
}

const MANAGER_ROLE = keccak256(utils.toUtf8Bytes("MANAGER_ROLE"));
const MINTER_ROLE = keccak256(utils.toUtf8Bytes("MINTER_ROLE"));

describe('Claim Contract Testing', () => {
    let admin, manager, minter, treasury, user1, user2, user3;
    let gov, gov2, rental, claim, box, heroes;

    const baseURI = 'https://empire-land.io/nft/';

    before(async() => {
        [admin, manager, minter, treasury, user1, user2, user3] = await ethers.getSigners();

        const GOV = await ethers.getContractFactory('EPLManagement', admin);
        gov = await GOV.deploy(treasury.address);
        gov2 = await GOV.deploy(treasury.address);

        const Heroes = await ethers.getContractFactory('EPLHeroes', admin);
        heroes = await Heroes.deploy(gov.address, baseURI);

        const Rental = await ethers.getContractFactory('Rental', admin);
        rental = await Rental.deploy(gov.address);

        const Claim = await ethers.getContractFactory('Claim', admin);
        claim = await Claim.deploy(gov.address);

        const Token721 = await ethers.getContractFactory('Token721', admin);
        box = await Token721.deploy();

        await gov.connect(admin).grantRole(MANAGER_ROLE, manager.address);
        await gov2.connect(admin).grantRole(MANAGER_ROLE, manager.address);
        await gov.connect(admin).grantRole(MINTER_ROLE, minter.address);

        await gov.connect(manager).addToList(heroes.address);
        await heroes.connect(manager).setRental(rental.address);
        
        const amount = 100;
        let fromID = 1;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        await box.mint(user1.address, fromID, amount);
        fromID = 101;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        await box.mint(user2.address, fromID, amount);
        fromID = 201;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        fromID = 301;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        fromID = 401;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        fromID = 501;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
    });

    it('Should link to EPLManagement contract', async() => {
        expect(await claim.gov()).deep.equal(gov.address);
    });

    it('Should revert when Non-Manager role tries to a new address of EPLManagement contract', async() => {
        expect(await claim.gov()).deep.equal(gov.address);

        await expect(
            claim.connect(minter).setGov(minter.address)
        ).to.be.revertedWith('Caller is not Manager');

        expect(await claim.gov()).deep.equal(gov.address);
    });

    it('Should succeed when Manager role updates a new address of EPLManagement', async() => {
        expect(await claim.gov()).deep.equal(gov.address);

        await claim.connect(manager).setGov(gov2.address);

        expect(await claim.gov()).deep.equal(gov2.address);

        //  set back to normal
        await claim.connect(manager).setGov(gov.address);
        expect(await claim.gov()).deep.equal(gov.address);
    });

    it('Should succeed when Manager role sets root of a special event', async() => {
        const eventID = 88;
        const root = utils.solidityKeccak256(['string'], ['Root - Testing1']);

        expect(await claim.roots(eventID)).deep.equal(ethers.constants.HashZero);

        await claim.connect(manager).setRoot(eventID, root);

        expect(await claim.roots(eventID)).deep.equal(root);
    });

    it('Should revert when Non-Manager role sets root of a special event', async() => {
        const eventID = 69;
        const root = utils.solidityKeccak256(['string'], ['Root - Invalid Caller']);

        expect(await claim.roots(eventID)).deep.equal(ethers.constants.HashZero);

        await expect(
            claim.connect(admin).setRoot(eventID, root)
        ).to.be.revertedWith('Caller is not Manager');

        expect(await claim.roots(eventID)).deep.equal(ethers.constants.HashZero);
    });

    it('Should revert when Non-Manager role tries to update existing root of a special event', async() => {
        const eventID = 88;
        const prev_root = utils.solidityKeccak256(['string'], ['Root - Testing1']);
        const root = utils.solidityKeccak256(['string'], ['Root - Update existing root']);

        expect(await claim.roots(eventID)).deep.equal(prev_root);

        await expect(
            claim.connect(admin).setRoot(eventID, root)
        ).to.be.revertedWith('Caller is not Manager');

        expect(await claim.roots(eventID)).deep.equal(prev_root);
    });

    it('Should revert when Manager role tries to update existing root of a special event', async() => {
        const eventID = 88;
        const prev_root = utils.solidityKeccak256(['string'], ['Root - Testing1']);
        const root = utils.solidityKeccak256(['string'], ['Root - Update existing root']);

        expect(await claim.roots(eventID)).deep.equal(prev_root);

        await expect(
            claim.connect(manager).setRoot(eventID, root)
        ).to.be.revertedWith('EventID recorded');

        expect(await claim.roots(eventID)).deep.equal(prev_root);
    });

    it('Should revert when Manager role tries to set root of a special event, but empty root', async() => {
        const eventID = 69;
        const root = ethers.constants.HashZero;

        expect(await claim.roots(eventID)).deep.equal(ethers.constants.HashZero);

        await expect(
            claim.connect(manager).setRoot(eventID, root)
        ).to.be.revertedWith('Empty Hash');

        expect(await claim.roots(eventID)).deep.equal(ethers.constants.HashZero);
    });

    it('Should revert when Non-Manager role tries to set root of a special event, but empty root', async() => {
        const eventID = 69;
        const root = ethers.constants.HashZero;

        expect(await claim.roots(eventID)).deep.equal(ethers.constants.HashZero);

        await expect(
            claim.connect(admin).setRoot(eventID, root)
        ).to.be.revertedWith('Caller is not Manager');

        expect(await claim.roots(eventID)).deep.equal(ethers.constants.HashZero);
    });
});