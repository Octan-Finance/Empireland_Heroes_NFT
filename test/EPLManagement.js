const chai = require('chai');
const chaiAsPromise = require('chai-as-promised');
const { utils } = require('ethers');

chai.use(chaiAsPromise);
const expect = chai.expect;

function keccak256(data) {
    return utils.keccak256(data);
}

const ZeroAddress = ethers.constants.AddressZero;
const DEFAULT_ADMIN_ROLE = ethers.constants.HashZero;
const MANAGER_ROLE = keccak256(utils.toUtf8Bytes("MANAGER_ROLE"));
const MINTER_ROLE = keccak256(utils.toUtf8Bytes("MINTER_ROLE"));

describe('EPLManagement Contract Testing', () => {
    let admin, manager, minter, treasury;
    let newAdmin, newMinter, newManager, newTreasury;
    let token721, token20;
    let gov;

    before(async() => {
        [admin, manager, minter, treasury, newAdmin, newMinter, newManager, newTreasury] = await ethers.getSigners();

        const GOV = await ethers.getContractFactory('EPLManagement', admin);
        gov = await GOV.deploy(treasury.address);

        const Token721 = await ethers.getContractFactory('Token721', admin);
        token721 = await Token721.deploy();

        const Token20 = await ethers.getContractFactory('Token20', admin);
        token20 = await Token20.deploy();
    });

    it('Should be able to query DEFAULT_ADMIN_ROLE', async() => {
        expect(await gov.getRoleMemberCount(DEFAULT_ADMIN_ROLE)).deep.equal(1);
        expect(await gov.getRoleMember(DEFAULT_ADMIN_ROLE, 0)).deep.equal(admin.address);
    });

    it('Should be able to query MANAGER_ROLE', async() => {
        expect(await gov.getRoleMemberCount(MANAGER_ROLE)).deep.equal(0);
    });

    it('Should be able to query MINTER_ROLE', async() => {
        expect(await gov.getRoleMemberCount(MINTER_ROLE)).deep.equal(0);
    });

    it('Should be able to query Treasury address', async() => {
        expect(await gov.treasury()).deep.equal(treasury.address);
    });

    it('Should be able to grant DEFAULT_ADMIN_ROLE to another', async() => {
        await gov.connect(admin).grantRole(DEFAULT_ADMIN_ROLE, newAdmin.address);
        expect(await gov.getRoleMemberCount(DEFAULT_ADMIN_ROLE)).deep.equal(2);
        expect(await gov.getRoleMember(DEFAULT_ADMIN_ROLE, 0)).deep.equal(admin.address);
        expect(await gov.getRoleMember(DEFAULT_ADMIN_ROLE, 1)).deep.equal(newAdmin.address);
        expect(await gov.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).deep.equal(true);
        expect(await gov.hasRole(DEFAULT_ADMIN_ROLE, newAdmin.address)).deep.equal(true);
    });

    it('Should be able to grant MANAGER_ROLE to self', async() => {
        await gov.connect(admin).grantRole(MANAGER_ROLE, admin.address);
        expect(await gov.getRoleMemberCount(MANAGER_ROLE)).deep.equal(1);
        expect(await gov.getRoleMember(MANAGER_ROLE, 0)).deep.equal(admin.address);
        expect(await gov.hasRole(MANAGER_ROLE, admin.address)).deep.equal(true);
    });

    it('Should be able to grant MANAGER_ROLE to another', async() => {
        await gov.connect(admin).grantRole(MANAGER_ROLE, manager.address);
        expect(await gov.getRoleMemberCount(MANAGER_ROLE)).deep.equal(2);
        expect(await gov.getRoleMember(MANAGER_ROLE, 0)).deep.equal(admin.address);
        expect(await gov.getRoleMember(MANAGER_ROLE, 1)).deep.equal(manager.address);
        expect(await gov.hasRole(MANAGER_ROLE, admin.address)).deep.equal(true);
        expect(await gov.hasRole(MANAGER_ROLE, manager.address)).deep.equal(true);
    });

    it('Should be able to grant MINTER_ROLE to self', async() => {
        await gov.connect(admin).grantRole(MINTER_ROLE, admin.address);
        expect(await gov.getRoleMemberCount(MINTER_ROLE)).deep.equal(1);
        expect(await gov.getRoleMember(MINTER_ROLE, 0)).deep.equal(admin.address);
        expect(await gov.hasRole(MINTER_ROLE, admin.address)).deep.equal(true);
    });

    it('Should be able to grant MINTER_ROLE to another', async() => {
        await gov.connect(admin).grantRole(MINTER_ROLE, minter.address);
        expect(await gov.getRoleMemberCount(MINTER_ROLE)).deep.equal(2);
        expect(await gov.getRoleMember(MINTER_ROLE, 0)).deep.equal(admin.address);
        expect(await gov.getRoleMember(MINTER_ROLE, 1)).deep.equal(minter.address);
        expect(await gov.hasRole(MINTER_ROLE, admin.address)).deep.equal(true);
        expect(await gov.hasRole(MINTER_ROLE, minter.address)).deep.equal(true);
    });

    it('Should be able to revoke DEFAULT_ADMIN_ROLE', async() => {
        await gov.connect(admin).revokeRole(DEFAULT_ADMIN_ROLE, newAdmin.address);
        expect(await gov.getRoleMemberCount(DEFAULT_ADMIN_ROLE)).deep.equal(1);
        expect(await gov.getRoleMember(DEFAULT_ADMIN_ROLE, 0)).deep.equal(admin.address);
    });

    it('Should be able to renounce DEFAULT_ADMIN_ROLE', async() => {
        await gov.connect(admin).grantRole(DEFAULT_ADMIN_ROLE, newAdmin.address);
        expect(await gov.getRoleMemberCount(DEFAULT_ADMIN_ROLE)).deep.equal(2);
        expect(await gov.getRoleMember(DEFAULT_ADMIN_ROLE, 0)).deep.equal(admin.address);
        expect(await gov.getRoleMember(DEFAULT_ADMIN_ROLE, 1)).deep.equal(newAdmin.address);

        await gov.connect(admin).renounceRole(DEFAULT_ADMIN_ROLE, admin.address);
        expect(await gov.getRoleMemberCount(DEFAULT_ADMIN_ROLE)).deep.equal(1);
        expect(await gov.getRoleMember(DEFAULT_ADMIN_ROLE, 0)).deep.equal(newAdmin.address);
    });

    it('Should revert when Old Admin tries to update Treasury', async() => {
        await expect(
            gov.connect(admin).updateTreasury(newTreasury.address)
        ).to.be.revertedWith('AccessControl');
        expect(await gov.treasury()).deep.equal(treasury.address);
    });

    it('Should revert when Old Admin tries to grant MANAGER_ROLE to another', async() => {
        expect(await gov.getRoleMemberCount(MANAGER_ROLE)).deep.equal(2);
        expect(await gov.getRoleMember(MANAGER_ROLE, 0)).deep.equal(admin.address);
        expect(await gov.getRoleMember(MANAGER_ROLE, 1)).deep.equal(manager.address);
        expect(await gov.hasRole(MANAGER_ROLE, admin.address)).deep.equal(true);
        expect(await gov.hasRole(MANAGER_ROLE, manager.address)).deep.equal(true);

        await expect(
            gov.connect(admin).grantRole(MANAGER_ROLE, newManager.address)
        ).to.be.revertedWith('AccessControl');

        expect(await gov.getRoleMemberCount(MANAGER_ROLE)).deep.equal(2);
        expect(await gov.getRoleMember(MANAGER_ROLE, 0)).deep.equal(admin.address);
        expect(await gov.getRoleMember(MANAGER_ROLE, 1)).deep.equal(manager.address);
        expect(await gov.hasRole(MANAGER_ROLE, admin.address)).deep.equal(true);
        expect(await gov.hasRole(MANAGER_ROLE, manager.address)).deep.equal(true);
        expect(await gov.hasRole(MANAGER_ROLE, newManager.address)).deep.equal(false);
    });

    it('Should revert when Old Admin tries to grant MINTER_ROLE to another', async() => {
        expect(await gov.getRoleMemberCount(MINTER_ROLE)).deep.equal(2);
        expect(await gov.getRoleMember(MINTER_ROLE, 0)).deep.equal(admin.address);
        expect(await gov.getRoleMember(MINTER_ROLE, 1)).deep.equal(minter.address);
        expect(await gov.hasRole(MINTER_ROLE, admin.address)).deep.equal(true);
        expect(await gov.hasRole(MINTER_ROLE, minter.address)).deep.equal(true);

        await expect(
            gov.connect(admin).grantRole(MINTER_ROLE, newMinter.address)
        ).to.be.revertedWith('AccessControl');

        expect(await gov.getRoleMemberCount(MINTER_ROLE)).deep.equal(2);
        expect(await gov.getRoleMember(MINTER_ROLE, 0)).deep.equal(admin.address);
        expect(await gov.getRoleMember(MINTER_ROLE, 1)).deep.equal(minter.address);
        expect(await gov.hasRole(MINTER_ROLE, admin.address)).deep.equal(true);
        expect(await gov.hasRole(MINTER_ROLE, minter.address)).deep.equal(true);
        expect(await gov.hasRole(MINTER_ROLE, newMinter.address)).deep.equal(false);
    });

    it('Should succeed when New Admin grant himself as MANAGER_ROLE', async() => {
        await gov.connect(newAdmin).grantRole(MANAGER_ROLE, newAdmin.address);

        expect(await gov.getRoleMemberCount(MANAGER_ROLE)).deep.equal(3);
        expect(await gov.getRoleMember(MANAGER_ROLE, 0)).deep.equal(admin.address);
        expect(await gov.getRoleMember(MANAGER_ROLE, 1)).deep.equal(manager.address);
        expect(await gov.getRoleMember(MANAGER_ROLE, 2)).deep.equal(newAdmin.address);
    });

    it('Should succeed when New Admin grant himself as MINTER_ROLE', async() => {
        await gov.connect(newAdmin).grantRole(MINTER_ROLE, newAdmin.address);

        expect(await gov.getRoleMemberCount(MINTER_ROLE)).deep.equal(3);
        expect(await gov.getRoleMember(MINTER_ROLE, 0)).deep.equal(admin.address);
        expect(await gov.getRoleMember(MINTER_ROLE, 1)).deep.equal(minter.address);
        expect(await gov.getRoleMember(MINTER_ROLE, 2)).deep.equal(newAdmin.address);
    });

    it('Should succeed when Old Admin renounce MANAGER_ROLE of himself', async() => {
        await gov.connect(admin).renounceRole(MANAGER_ROLE, admin.address);

        expect(await gov.getRoleMemberCount(MANAGER_ROLE)).deep.equal(2);
        expect(await gov.getRoleMember(MANAGER_ROLE, 0)).deep.equal(newAdmin.address);
        expect(await gov.getRoleMember(MANAGER_ROLE, 1)).deep.equal(manager.address);
    });

    it('Should succeed when Old Admin renounce MINTER_ROLE of himself', async() => {
        await gov.connect(admin).renounceRole(MINTER_ROLE, admin.address);

        expect(await gov.getRoleMemberCount(MINTER_ROLE)).deep.equal(2);
        expect(await gov.getRoleMember(MINTER_ROLE, 0)).deep.equal(newAdmin.address);
        expect(await gov.getRoleMember(MINTER_ROLE, 1)).deep.equal(minter.address);
    });

    it('Should succeed when New Admin grant MANAGER_ROLE to another', async() => {
        await gov.connect(newAdmin).grantRole(MANAGER_ROLE, newManager.address);

        expect(await gov.getRoleMemberCount(MANAGER_ROLE)).deep.equal(3);
        expect(await gov.getRoleMember(MANAGER_ROLE, 0)).deep.equal(newAdmin.address);
        expect(await gov.getRoleMember(MANAGER_ROLE, 1)).deep.equal(manager.address);
        expect(await gov.getRoleMember(MANAGER_ROLE, 2)).deep.equal(newManager.address);
    });

    it('Should succeed when New Admin grant MINTER_ROLE to another', async() => {
        await gov.connect(newAdmin).grantRole(MINTER_ROLE, newMinter.address);

        expect(await gov.getRoleMemberCount(MINTER_ROLE)).deep.equal(3);
        expect(await gov.getRoleMember(MINTER_ROLE, 0)).deep.equal(newAdmin.address);
        expect(await gov.getRoleMember(MINTER_ROLE, 1)).deep.equal(minter.address);
        expect(await gov.getRoleMember(MINTER_ROLE, 2)).deep.equal(newMinter.address);
    });
    
    it('Should succeed when New Admin tries to update Treasury', async() => {
        await gov.connect(newAdmin).updateTreasury(newTreasury.address);
        expect(await gov.treasury()).deep.equal(newTreasury.address);
    });

    it('Should revert when Unauthorized user tries to add NFT contract to list', async() => {
        expect(await gov.listOfNFTs(token721.address)).deep.equal(false);

        await expect(
            gov.connect(admin).addToList(token721.address)
        ).to.be.revertedWith('AccessControl');

        expect(await gov.listOfNFTs(token721.address)).deep.equal(false);
    });

    it('Should revert when MANAGER_ROLE adds NFT contract to list, but set zero address', async() => {
        await expect(
            gov.connect(manager).addToList(ZeroAddress)
        ).to.be.revertedWith('Set zero address');
    });

    it('Should succeed when MANAGER_ROLE adds NFT contract to list', async() => {
        expect(await gov.listOfNFTs(token721.address)).deep.equal(false);

        await gov.connect(manager).addToList(token721.address)

        expect(await gov.listOfNFTs(token721.address)).deep.equal(true);
    });

    it('Should revert when MANAGER_ROLE adds NFT contract to list, but already added', async() => {
        expect(await gov.listOfNFTs(token721.address)).deep.equal(true);

        await expect(
            gov.connect(manager).addToList(token721.address)
        ).to.be.revertedWith('Already added');

        expect(await gov.listOfNFTs(token721.address)).deep.equal(true);
    });

    it('Should revert when Unauthorized user tries to remove NFT contract from list', async() => {
        expect(await gov.listOfNFTs(token721.address)).deep.equal(true);

        await expect(
            gov.connect(admin).removeFromList(token721.address)
        ).to.be.revertedWith('AccessControl');

        expect(await gov.listOfNFTs(token721.address)).deep.equal(true);
    });

    it('Should succeed when MANAGER_ROLE removes NFT contract from list', async() => {
        expect(await gov.listOfNFTs(token721.address)).deep.equal(true);

        await gov.connect(manager).removeFromList(token721.address)

        expect(await gov.listOfNFTs(token721.address)).deep.equal(false);
    });

    it('Should revert when MANAGER_ROLE removes NFT contract from list, but not exists', async() => {
        expect(await gov.listOfNFTs(token721.address)).deep.equal(false);

        await expect(
            gov.connect(manager).removeFromList(token721.address)
        ).to.be.revertedWith('Not found');

        expect(await gov.listOfNFTs(token721.address)).deep.equal(false);
    });

    it('Should revert when Unauthorized user tries to add payment token', async() => {
        expect(await gov.paymentTokens(token20.address)).deep.equal(false);

        await expect(
            gov.connect(admin).addPayment(token20.address)
        ).to.be.revertedWith('AccessControl');

        expect(await gov.paymentTokens(token20.address)).deep.equal(false);
    });

    it('Should succeed when MANAGER_ROLE adds payment token - Zero Address', async() => {
        expect(await gov.paymentTokens(ZeroAddress)).deep.equal(false);

        await gov.connect(manager).addPayment(ZeroAddress)

        expect(await gov.paymentTokens(ZeroAddress)).deep.equal(true);
    });

    it('Should succeed when MANAGER_ROLE adds payment token - Non-zero address', async() => {
        expect(await gov.paymentTokens(token20.address)).deep.equal(false);

        await gov.connect(manager).addPayment(token20.address)

        expect(await gov.paymentTokens(token20.address)).deep.equal(true);
    });

    it('Should revert when MANAGER_ROLE adds payment token, but already added', async() => {
        expect(await gov.paymentTokens(token20.address)).deep.equal(true);

        await expect(
            gov.connect(manager).addPayment(token20.address)
        ).to.be.revertedWith('Payment is accepted');

        expect(await gov.paymentTokens(token20.address)).deep.equal(true);
    });

    it('Should revert when Unauthorized user tries to remove payment token', async() => {
        expect(await gov.paymentTokens(token20.address)).deep.equal(true);

        await expect(
            gov.connect(admin).removePayment(token20.address)
        ).to.be.revertedWith('AccessControl');

        expect(await gov.paymentTokens(token20.address)).deep.equal(true);
    });

    it('Should succeed when MANAGER_ROLE removes payment token - Zero Address', async() => {
        expect(await gov.paymentTokens(ZeroAddress)).deep.equal(true);

        await gov.connect(manager).removePayment(ZeroAddress)

        expect(await gov.paymentTokens(ZeroAddress)).deep.equal(false);
    });

    it('Should succeed when MANAGER_ROLE removes payment token - Non-zero address', async() => {
        expect(await gov.paymentTokens(token20.address)).deep.equal(true);

        await gov.connect(manager).removePayment(token20.address)

        expect(await gov.paymentTokens(token20.address)).deep.equal(false);
    });

    it('Should revert when MANAGER_ROLE removes payment token, but already removed', async() => {
        expect(await gov.paymentTokens(token20.address)).deep.equal(false);

        await expect(
            gov.connect(manager).removePayment(token20.address)
        ).to.be.revertedWith('Not found');

        expect(await gov.paymentTokens(token20.address)).deep.equal(false);
    });

    it('Should revert when Unauthorized user tries to call halt()', async() => {
        expect(await gov.halted()).deep.equal(false);

        await expect(
            gov.connect(admin).halt()
        ).to.be.revertedWith('AccessControl');

        expect(await gov.halted()).deep.equal(false);
    });

    it('Should succeed when MANAGER_ROLE calls halt()', async() => {
        expect(await gov.halted()).deep.equal(false);

        await gov.connect(manager).halt()

        expect(await gov.halted()).deep.equal(true);
    });

    it('Should revert when Unauthorized user tries to call unhalt()', async() => {
        expect(await gov.halted()).deep.equal(true);

        await expect(
            gov.connect(admin).unhalt()
        ).to.be.revertedWith('AccessControl');

        expect(await gov.halted()).deep.equal(true);
    });

    it('Should succeed when MANAGER_ROLE calls unhalt()', async() => {
        expect(await gov.halted()).deep.equal(true);

        await gov.connect(manager).unhalt()

        expect(await gov.halted()).deep.equal(false);
    });
});