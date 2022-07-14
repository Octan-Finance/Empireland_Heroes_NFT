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

describe('Redemption Contract Testing', () => {
    let admin, manager, minter, treasury, user1, user2, user3;
    let gov, rental, redemption, box, heroes;

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

        const Redemption = await ethers.getContractFactory('Redemption', admin);
        redemption = await Redemption.deploy(gov.address);

        const Token721 = await ethers.getContractFactory('Token721', admin);
        box = await Token721.deploy();

        await gov.connect(admin).grantRole(MANAGER_ROLE, manager.address);
        await gov.connect(admin).grantRole(MINTER_ROLE, minter.address);

        await gov.connect(manager).addToList(heroes.address);
        await heroes.connect(manager).setRental(rental.address);
        
        let amount = 100;
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

        fromID = 601;
        amount = 5;
        await heroes.connect(minter).breed(minter.address, fromID, amount);
    });

    it('Should revert when Non-Manager role tries to call redeem()', async() => {
        const boxIDs = [1, 2, 3, 4, 5];
        const heroesIDs = [1, 2, 3, 4, 5];

        const user1_box = await box.balanceOf(user1.address);
        const user1_heroes = await heroes.balanceOf(user1.address);
        const manager_heroes = await heroes.balanceOf(manager.address);

        await expect(
            redemption.connect(user1).redeem(
                box.address, heroes.address, manager.address, user1.address, boxIDs, heroesIDs
            )
        ).to.be.revertedWith('Caller is not Manager');

        expect( await box.balanceOf(user1.address)).deep.equal(user1_box);
        expect( await heroes.balanceOf(user1.address)).deep.equal(user1_heroes);
        expect( await heroes.balanceOf(manager.address)).deep.equal(manager_heroes);
    });

    it('Should revert when Manager role calls to redeem(), but size mismatch - Burning box > minting Heroes', async() => {
        const boxIDs = [1, 2, 3, 4, 5];
        const heroesIDs = [1, 2, 3, 4];

        const user1_box = await box.balanceOf(user1.address);
        const user1_heroes = await heroes.balanceOf(user1.address);
        const manager_heroes = await heroes.balanceOf(manager.address);

        await expect(
            redemption.connect(manager).redeem(
                box.address, heroes.address, manager.address, user1.address, boxIDs, heroesIDs
            )
        ).to.be.revertedWith('Size mismatch');

        expect( await box.balanceOf(user1.address)).deep.equal(user1_box);
        expect( await heroes.balanceOf(user1.address)).deep.equal(user1_heroes);
        expect( await heroes.balanceOf(manager.address)).deep.equal(manager_heroes);
    });

    it('Should revert when Manager role calls to redeem(), but size mismatch - Burning box < minting Heroes', async() => {
        const boxIDs = [1, 2, 3, 4];
        const heroesIDs = [1, 2, 3, 4, 5];

        const user1_box = await box.balanceOf(user1.address);
        const user1_heroes = await heroes.balanceOf(user1.address);
        const manager_heroes = await heroes.balanceOf(manager.address);

        await expect(
            redemption.connect(manager).redeem(
                box.address, heroes.address, manager.address, user1.address, boxIDs, heroesIDs
            )
        ).to.be.revertedWith('Size mismatch');

        expect( await box.balanceOf(user1.address)).deep.equal(user1_box);
        expect( await heroes.balanceOf(user1.address)).deep.equal(user1_heroes);
        expect( await heroes.balanceOf(manager.address)).deep.equal(manager_heroes);
    });

    it('Should revert when Manager role calls to redeem(), but User1 not yet setApprovalForAll', async() => {
        const boxIDs = [1, 2, 3, 4];
        const heroesIDs = [1, 2, 3, 4, 5];

        const user1_box = await box.balanceOf(user1.address);
        const user1_heroes = await heroes.balanceOf(user1.address);
        const manager_heroes = await heroes.balanceOf(manager.address);

        await expect(
            redemption.connect(manager).redeem(
                box.address, heroes.address, manager.address, user1.address, boxIDs, heroesIDs
            )
        ).to.be.revertedWith('Size mismatch');

        expect( await box.balanceOf(user1.address)).deep.equal(user1_box);
        expect( await heroes.balanceOf(user1.address)).deep.equal(user1_heroes);
        expect( await heroes.balanceOf(manager.address)).deep.equal(manager_heroes);
    });

    it('Should revert when Manager role calls to redeem(), but Distributor not yet setApprovalForAll', async() => {
        const boxIDs = [1, 2, 3, 4];
        const heroesIDs = [1, 2, 3, 4, 5];

        const user1_box = await box.balanceOf(user1.address);
        const user1_heroes = await heroes.balanceOf(user1.address);
        const manager_heroes = await heroes.balanceOf(manager.address);

        await box.connect(user1).setApprovalForAll(redemption.address, true);

        await expect(
            redemption.connect(manager).redeem(
                box.address, heroes.address, manager.address, user1.address, boxIDs, heroesIDs
            )
        ).to.be.revertedWith('Size mismatch');

        expect( await box.balanceOf(user1.address)).deep.equal(user1_box);
        expect( await heroes.balanceOf(user1.address)).deep.equal(user1_heroes);
        expect( await heroes.balanceOf(manager.address)).deep.equal(manager_heroes);
    });

    it('Should revert when Manager role calls to redeem(), but User1 not owned all of BoxIDs', async() => {
        const boxIDs = [101, 102, 103, 104, 105];
        const heroesIDs = [1, 2, 3, 4, 5];

        const user1_box = await box.balanceOf(user1.address);
        const user1_heroes = await heroes.balanceOf(user1.address);
        const manager_heroes = await heroes.balanceOf(manager.address);

        await box.connect(user1).setApprovalForAll(redemption.address, true);
        await heroes.connect(manager).setApprovalForAll(redemption.address, true);

        await expect(
            redemption.connect(manager).redeem(
                box.address, heroes.address, manager.address, user1.address, boxIDs, heroesIDs
            )
        ).to.be.revertedWith('Box/Ticket not owned');

        expect( await box.balanceOf(user1.address)).deep.equal(user1_box);
        expect( await heroes.balanceOf(user1.address)).deep.equal(user1_heroes);
        expect( await heroes.balanceOf(manager.address)).deep.equal(manager_heroes);
    });

    it('Should revert when Manager role calls to redeem(), but User1 not owned one BoxID', async() => {
        const boxIDs = [1, 2, 3, 4, 101];
        const heroesIDs = [1, 2, 3, 4, 5];

        const user1_box = await box.balanceOf(user1.address);
        const user1_heroes = await heroes.balanceOf(user1.address);
        const manager_heroes = await heroes.balanceOf(manager.address);

        await box.connect(user1).setApprovalForAll(redemption.address, true);
        await heroes.connect(manager).setApprovalForAll(redemption.address, true);

        await expect(
            redemption.connect(manager).redeem(
                box.address, heroes.address, manager.address, user1.address, boxIDs, heroesIDs
            )
        ).to.be.revertedWith('Box/Ticket not owned');

        expect( await box.balanceOf(user1.address)).deep.equal(user1_box);
        expect( await heroes.balanceOf(user1.address)).deep.equal(user1_heroes);
        expect( await heroes.balanceOf(manager.address)).deep.equal(manager_heroes);
    });

    it('Should revert when Manager role calls to redeem(), but heroesIDs not existed', async() => {
        const boxIDs = [1, 2 , 3, 4, 5];
        const heroesIDs = [700, 701, 702, 703, 704];

        const user1_box = await box.balanceOf(user1.address);
        const user1_heroes = await heroes.balanceOf(user1.address);
        const manager_heroes = await heroes.balanceOf(manager.address);

        await box.connect(user1).setApprovalForAll(redemption.address, true);
        await heroes.connect(manager).setApprovalForAll(redemption.address, true);

        await expect(
            redemption.connect(manager).redeem(
                box.address, heroes.address, manager.address, user1.address, boxIDs, heroesIDs
            )
        ).to.be.revertedWith('ERC721: invalid token ID');

        expect( await box.balanceOf(user1.address)).deep.equal(user1_box);
        expect( await heroes.balanceOf(user1.address)).deep.equal(user1_heroes);
        expect( await heroes.balanceOf(manager.address)).deep.equal(manager_heroes);
    });

    it('Should revert when Manager role calls to redeem(), but Heroes not owned', async() => {
        const boxIDs = [1, 2, 3, 4, 5];
        const heroesIDs = [601, 602, 603, 604, 605];

        const user1_box = await box.balanceOf(user1.address);
        const user1_heroes = await heroes.balanceOf(user1.address);
        const manager_heroes = await heroes.balanceOf(manager.address);

        await box.connect(user1).setApprovalForAll(redemption.address, true);
        await heroes.connect(manager).setApprovalForAll(redemption.address, true);

        await expect(
            redemption.connect(manager).redeem(
                box.address, heroes.address, manager.address, user1.address, boxIDs, heroesIDs
            )
        ).to.be.revertedWith('ERC721: caller is not token owner nor approved');

        expect( await box.balanceOf(user1.address)).deep.equal(user1_box);
        expect( await heroes.balanceOf(user1.address)).deep.equal(user1_heroes);
        expect( await heroes.balanceOf(manager.address)).deep.equal(manager_heroes);
    });

    it('Should revert when Manager role calls to redeem(), but one Hero already transferred to other', async() => {
        const boxIDs = [1, 2, 3, 4, 5];
        const heroesIDs = [1, 2, 3, 4, 5];

        await heroes.connect(manager).transferFrom(manager.address, minter.address, heroesIDs[4]);

        const user1_box = await box.balanceOf(user1.address);
        const user1_heroes = await heroes.balanceOf(user1.address);
        const manager_heroes = await heroes.balanceOf(manager.address);

        await box.connect(user1).setApprovalForAll(redemption.address, true);
        await heroes.connect(manager).setApprovalForAll(redemption.address, true);

        await expect(
            redemption.connect(manager).redeem(
                box.address, heroes.address, manager.address, user1.address, boxIDs, heroesIDs
            )
        ).to.be.revertedWith('ERC721: caller is not token owner nor approved');

        expect( await box.balanceOf(user1.address)).deep.equal(user1_box);
        expect( await heroes.balanceOf(user1.address)).deep.equal(user1_heroes);
        expect( await heroes.balanceOf(manager.address)).deep.equal(manager_heroes);
    });

    it('Should succeed redeem boxes to User when Manager role calls redeem() with valid settings', async() => {
        const boxIDs = [1, 2, 3, 4, 5];
        const heroesIDs = [10, 11, 12, 13, 14];

        const user1_box = await box.balanceOf(user1.address);
        const user1_heroes = await heroes.balanceOf(user1.address);
        const manager_heroes = await heroes.balanceOf(manager.address);

        await box.connect(user1).setApprovalForAll(redemption.address, true);
        await heroes.connect(manager).setApprovalForAll(redemption.address, true);

        await redemption.connect(manager).redeem(
            box.address, heroes.address, manager.address, user1.address, boxIDs, heroesIDs
        )

        expect( await box.balanceOf(user1.address)).deep.equal( user1_box.sub(boxIDs.length) );
        expect( await heroes.balanceOf(user1.address)).deep.equal( user1_heroes.add(heroesIDs.length) );
        expect( await heroes.balanceOf(manager.address)).deep.equal( manager_heroes.sub(heroesIDs.length) );
        expect( await heroes.ownerOf(heroesIDs[0]) ).deep.equal(user1.address);
        expect( await heroes.ownerOf(heroesIDs[1]) ).deep.equal(user1.address);
        expect( await heroes.ownerOf(heroesIDs[2]) ).deep.equal(user1.address);
        expect( await heroes.ownerOf(heroesIDs[3]) ).deep.equal(user1.address);
        expect( await heroes.ownerOf(heroesIDs[4]) ).deep.equal(user1.address);
    });

    it('Should succeed redeem boxes to another User when Manager role calls redeem() with valid settings', async() => {
        const boxIDs = [101, 102, 103, 104, 105];
        const heroesIDs = [15, 16, 17, 18, 19];

        const user2_box = await box.balanceOf(user2.address);
        const user2_heroes = await heroes.balanceOf(user2.address);
        const manager_heroes = await heroes.balanceOf(manager.address);

        await box.connect(user2).setApprovalForAll(redemption.address, true);
        await heroes.connect(manager).setApprovalForAll(redemption.address, true);

        await redemption.connect(manager).redeem(
            box.address, heroes.address, manager.address, user2.address, boxIDs, heroesIDs
        )

        expect( await box.balanceOf(user2.address)).deep.equal( user2_box.sub(boxIDs.length) );
        expect( await heroes.balanceOf(user2.address)).deep.equal( user2_heroes.add(heroesIDs.length) );
        expect( await heroes.balanceOf(manager.address)).deep.equal( manager_heroes.sub(heroesIDs.length) );
        expect( await heroes.ownerOf(heroesIDs[0]) ).deep.equal(user2.address);
        expect( await heroes.ownerOf(heroesIDs[1]) ).deep.equal(user2.address);
        expect( await heroes.ownerOf(heroesIDs[2]) ).deep.equal(user2.address);
        expect( await heroes.ownerOf(heroesIDs[3]) ).deep.equal(user2.address);
        expect( await heroes.ownerOf(heroesIDs[4]) ).deep.equal(user2.address);
    });

    it('Should succeed redeem boxes to existed User when Manager role calls redeem() with valid settings', async() => {
        const boxIDs = [10, 11, 12, 13, 14];
        const heroesIDs = [20, 21, 22, 23, 24];

        const user1_box = await box.balanceOf(user1.address);
        const user1_heroes = await heroes.balanceOf(user1.address);
        const manager_heroes = await heroes.balanceOf(manager.address);

        await box.connect(user1).setApprovalForAll(redemption.address, true);
        await heroes.connect(manager).setApprovalForAll(redemption.address, true);

        await redemption.connect(manager).redeem(
            box.address, heroes.address, manager.address, user1.address, boxIDs, heroesIDs
        )

        expect( await box.balanceOf(user1.address)).deep.equal( user1_box.sub(boxIDs.length) );
        expect( await heroes.balanceOf(user1.address)).deep.equal( user1_heroes.add(heroesIDs.length) );
        expect( await heroes.balanceOf(manager.address)).deep.equal( manager_heroes.sub(heroesIDs.length) );
        expect( await heroes.ownerOf(heroesIDs[0]) ).deep.equal(user1.address);
        expect( await heroes.ownerOf(heroesIDs[1]) ).deep.equal(user1.address);
        expect( await heroes.ownerOf(heroesIDs[2]) ).deep.equal(user1.address);
        expect( await heroes.ownerOf(heroesIDs[3]) ).deep.equal(user1.address);
        expect( await heroes.ownerOf(heroesIDs[4]) ).deep.equal(user1.address);
    });

    it('Should succeed when Manager role disables Redemption contract by setting address(0)', async() => {
        expect(await redemption.gov()).deep.equal(gov.address);

        await redemption.connect(manager).setGov(ethers.constants.AddressZero);

        expect(await redemption.gov()).deep.equal(ethers.constants.AddressZero);
    });

    it('Should fully disable redeem() after setting GOV contract to address(0) - Manager role tries to call', async() => {
        const boxIDs = [30, 31, 32, 33, 34];
        const heroesIDs = [400, 401, 402, 403, 404];

        const user1_box = await box.balanceOf(user1.address);
        const user1_heroes = await heroes.balanceOf(user1.address);
        const manager_heroes = await heroes.balanceOf(manager.address);

        await box.connect(user1).setApprovalForAll(redemption.address, true);
        await heroes.connect(manager).setApprovalForAll(redemption.address, true);

        await expect(
            redemption.connect(manager).redeem(
                box.address, heroes.address, manager.address, user1.address, boxIDs, heroesIDs
            )
        ).to.be.revertedWith('function call to a non-contract account');

        expect( await box.balanceOf(user1.address)).deep.equal(user1_box);
        expect( await heroes.balanceOf(user1.address)).deep.equal(user1_heroes);
        expect( await heroes.balanceOf(manager.address)).deep.equal(manager_heroes);
    });

    it('Should fully disable redeem() after setting GOV contract to address(0) - Non-Manager role tries to call', async() => {
        const boxIDs = [30, 31, 32, 33, 34];
        const heroesIDs = [400, 401, 402, 403, 404];

        const user1_box = await box.balanceOf(user1.address);
        const user1_heroes = await heroes.balanceOf(user1.address);
        const manager_heroes = await heroes.balanceOf(manager.address);

        await box.connect(user1).setApprovalForAll(redemption.address, true);
        await heroes.connect(manager).setApprovalForAll(redemption.address, true);

        await expect(
            redemption.connect(user1).redeem(
                box.address, heroes.address, manager.address, user1.address, boxIDs, heroesIDs
            )
        ).to.be.revertedWith('function call to a non-contract account');

        expect( await box.balanceOf(user1.address)).deep.equal(user1_box);
        expect( await heroes.balanceOf(user1.address)).deep.equal(user1_heroes);
        expect( await heroes.balanceOf(manager.address)).deep.equal(manager_heroes);
    });
});