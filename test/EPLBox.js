const chai = require('chai');
const chaiAsPromise = require('chai-as-promised');
const { utils, BigNumber } = require('ethers');

chai.use(chaiAsPromise);
const expect = chai.expect;

function keccak256(data) {
    return utils.keccak256(data);
}

const Zero = ethers.constants.Zero;
const ZeroAddress = ethers.constants.AddressZero;
const MANAGER_ROLE = keccak256(utils.toUtf8Bytes("MANAGER_ROLE"));
const MINTER_ROLE = keccak256(utils.toUtf8Bytes("MINTER_ROLE"));

describe('EPLBox Contract Testing', () => {
    let admin, manager, minter, treasury, receiver;
    let gov, gov2, box;

    const baseURI = 'https://empire-land.io/nft/box/';

    before(async() => {
        [admin, manager, minter, treasury, receiver] = await ethers.getSigners();

        const GOV = await ethers.getContractFactory('EPLManagement', admin);
        gov = await GOV.deploy(treasury.address);
        gov2 = await GOV.deploy(treasury.address);

        const EPLBox = await ethers.getContractFactory('EPLBox', admin);
        box = await EPLBox.deploy(gov.address, baseURI);

        await gov.connect(admin).grantRole(MANAGER_ROLE, manager.address);
        await gov.connect(admin).grantRole(MINTER_ROLE, minter.address);
    });

    it('Should be able to query initialized settings', async() => {
        expect(await box.gov()).deep.equal(gov.address);
        expect(await box.baseURI()).deep.equal(baseURI);
    });

    it('Should revert when Non-Admin role tries to update Governance contract', async() => {
        expect(await box.gov()).deep.equal(gov.address);

        await expect(
            box.connect(manager).setGov(manager.address)
        ).to.be.revertedWith('Caller is not Admin');

        expect(await box.gov()).deep.equal(gov.address);
    });

    it('Should revert when Admin role updates Governance contract, but set zero address', async() => {
        expect(await box.gov()).deep.equal(gov.address);

        await expect(
            box.connect(admin).setGov(ZeroAddress)
        ).to.be.revertedWith('Set Zero Address');

        expect(await box.gov()).deep.equal(gov.address);
    });

    it('Should succeed when Admin role updates Governance contract', async() => {
        expect(await box.gov()).deep.equal(gov.address);

        await box.connect(admin).setGov(gov2.address);

        expect(await box.gov()).deep.equal(gov2.address);

        //  set back to normal
        await box.connect(admin).setGov(gov.address);
        expect(await box.gov()).deep.equal(gov.address);
    });

    it('Should revert when Non-Manager Role tries to update a new baseURI', async() => {
        expect(await box.baseURI()).deep.equal(baseURI);

        const newBaseURI = 'https://empire-land.io/nft/new/';
        await expect(
            box.connect(admin).updateBaseURI(newBaseURI)
        ).to.be.revertedWith('Caller is not Manager');
        
        expect(await box.baseURI()).deep.equal(baseURI);
    });

    it('Should revert when Manager tries to update new baseURI, but empty', async() => {
        expect(await box.baseURI()).deep.equal(baseURI);

        const newBaseURI = '';
        await expect(
            box.connect(manager).updateBaseURI(newBaseURI)
        ).to.be.revertedWith('Empty URI');

        expect(await box.baseURI()).deep.equal(baseURI);
    });

    it('Should be able to update new baseURI as Manager Role', async() => {
        expect(await box.baseURI()).deep.equal(baseURI);

        const newBaseURI = 'https://empire-land.io/nft/new/';
        await box.connect(manager).updateBaseURI(newBaseURI);
        expect(await box.baseURI()).deep.equal(newBaseURI);

        //  set back to normal
        await box.connect(manager).updateBaseURI(baseURI);
        expect(await box.baseURI()).deep.equal(baseURI);
    });

    it('Should revert when Non-Minter role tries to call mint()', async() => {
        expect(await box.balanceOf(manager.address)).deep.equal(Zero);

        const fromID = 1;
        const amount = 50;
        await expect(
            box.connect(admin).mint(manager.address, fromID, amount)
        ).to.be.revertedWith('Caller is not Minter');

        expect(await box.balanceOf(manager.address)).deep.equal(Zero);
    });
});