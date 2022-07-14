const chai = require('chai');
const chaiAsPromise = require('chai-as-promised');
const { utils, BigNumber } = require('ethers');

chai.use(chaiAsPromise);
const expect = chai.expect;

function keccak256(data) {
    return utils.keccak256(data);
}

const provider = ethers.provider;
const address0 = ethers.constants.AddressZero;
const emptyInfo = [
    BigNumber.from(0),
    BigNumber.from(0),
    "",        
    []           
]

const MANAGER_ROLE = keccak256(utils.toUtf8Bytes("MANAGER_ROLE"));

describe('LockPool Contract Testing', () => {
    let admin, manager, treasury, users;
    let gov, gov2, heroes, lp;
    let start, end;

    before(async() => {
        [admin, manager, treasury, ...users] = await ethers.getSigners();

        const GOV = await ethers.getContractFactory('EPLManagement', admin);
        gov = await GOV.deploy(treasury.address);
        gov2 = await GOV.deploy(treasury.address);

        const Token721 = await ethers.getContractFactory('Token721', admin);
        heroes = await Token721.deploy();

        await gov.connect(admin).grantRole(MANAGER_ROLE, manager.address);
        await gov2.connect(admin).grantRole(MANAGER_ROLE, manager.address);

        //  Get current timestamp
        const block = await provider.getBlockNumber();
        timestamp = (await provider.getBlock(block)).timestamp;

        //  Deploy Vesting contract
        start = timestamp + 3 * 24 * 3600       //  3 days
        end = timestamp + 33 * 24 * 3600        //  30 days after `start`
        const LockPool = await ethers.getContractFactory('LockPool', admin);
        lp = await LockPool.deploy(gov.address, heroes.address, start, end);
    });

    it('Should link to EPLManagement contract', async() => {
        expect(await lp.gov()).deep.equal(gov.address);
    });

    it('Should correctly set the information of LockPool', async() => {
        expect(await lp.token()).deep.equal(heroes.address);
        expect(await lp.start()).deep.equal(start);
        expect(await lp.end()).deep.equal(end);
    });

    it('Should revert when Non-Manager role tries to a new address of EPLManagement contract', async() => {
        expect(await lp.gov()).deep.equal(gov.address);

        await expect(
            lp.connect(users[0]).setGov(gov2.address)
        ).to.be.revertedWith('Caller is not Manager');

        expect(await lp.gov()).deep.equal(gov.address);
    });

    it('Should succeed when Manager role updates a new address of EPLManagement', async() => {
        expect(await lp.gov()).deep.equal(gov.address);

        await lp.connect(manager).setGov(gov2.address);

        expect(await lp.gov()).deep.equal(gov2.address);

        //  set back to normal
        await lp.connect(manager).setGov(gov.address);
        expect(await lp.gov()).deep.equal(gov.address);
    });

    it('Should revert when Non-Manager role tries to set the information of LockPool', async() => {
        expect(await lp.token()).deep.equal(heroes.address);
        expect(await lp.start()).deep.equal(start);
        expect(await lp.end()).deep.equal(end);

        const block = await provider.getBlockNumber();
        timestamp = (await provider.getBlock(block)).timestamp;

        const new_start = timestamp + 10 * 24 * 3600       
        const new_end = timestamp + 40 * 24 * 3600 

        await expect(
            lp.connect(users[0]).setLockPool(heroes.address, new_start, new_end)
        ).to.be.revertedWith('Caller is not Manager');

        expect(await lp.token()).deep.equal(heroes.address);
        expect(await lp.start()).deep.equal(start);
        expect(await lp.end()).deep.equal(end);
    });

    it('Should revert when Manager role tries to set the information of LockPool, but invalid information - Token = 0x00', async() => {
        expect(await lp.token()).deep.equal(heroes.address);
        expect(await lp.start()).deep.equal(start);
        expect(await lp.end()).deep.equal(end);

        const block = await provider.getBlockNumber();
        timestamp = (await provider.getBlock(block)).timestamp;

        const new_start = timestamp + 10 * 24 * 3600       
        const new_end = timestamp + 40 * 24 * 3600 

        await expect(
            lp.connect(manager).setLockPool(address0, new_start, new_end)
        ).to.be.revertedWith('Set zero address');

        expect(await lp.token()).deep.equal(heroes.address);
        expect(await lp.start()).deep.equal(start);
        expect(await lp.end()).deep.equal(end);
    });

    it('Should revert when Manager role tries to set the information of LockPool, but invalid schedule - Starting time in the past', async() => {
        expect(await lp.token()).deep.equal(heroes.address);
        expect(await lp.start()).deep.equal(start);
        expect(await lp.end()).deep.equal(end);

        const block = await provider.getBlockNumber();
        timestamp = (await provider.getBlock(block)).timestamp;

        const new_start = timestamp - 3600;    
        const new_end = timestamp + 40 * 24 * 3600 

        await expect(
            lp.connect(manager).setLockPool(heroes.address, new_start, new_end)
        ).to.be.revertedWith('Invalid schedule');

        expect(await lp.token()).deep.equal(heroes.address);
        expect(await lp.start()).deep.equal(start);
        expect(await lp.end()).deep.equal(end);
    });

    it('Should revert when Manager role tries to set the information of LockPool, but invalid schedule - Ending time less than starting time', async() => {
        expect(await lp.token()).deep.equal(heroes.address);
        expect(await lp.start()).deep.equal(start);
        expect(await lp.end()).deep.equal(end);

        const block = await provider.getBlockNumber();
        timestamp = (await provider.getBlock(block)).timestamp;

        const new_start = timestamp + 10 * 24 * 3600;    
        const new_end = timestamp + 5 * 24 * 3600 

        await expect(
            lp.connect(manager).setLockPool(heroes.address, new_start, new_end)
        ).to.be.revertedWith('Invalid schedule');

        expect(await lp.token()).deep.equal(heroes.address);
        expect(await lp.start()).deep.equal(start);
        expect(await lp.end()).deep.equal(end);
    });

    it('Should succeed when Manager role tries to set the information of LockPool with valid settings', async() => {
        expect(await lp.token()).deep.equal(heroes.address);
        expect(await lp.start()).deep.equal(start);
        expect(await lp.end()).deep.equal(end);

        const block = await provider.getBlockNumber();
        timestamp = (await provider.getBlock(block)).timestamp;

        const new_start = timestamp + 3 * 24 * 3600;    
        const new_end = timestamp + 33 * 24 * 3600 

        await lp.connect(manager).setLockPool(heroes.address, new_start, new_end)

        expect(await lp.token()).deep.equal(heroes.address);
        expect(await lp.start()).deep.equal(new_start);
        expect(await lp.end()).deep.equal(new_end);

        // set back to normal
        await lp.connect(manager).setLockPool(heroes.address, start, end)
        expect(await lp.token()).deep.equal(heroes.address);
        expect(await lp.start()).deep.equal(start);
        expect(await lp.end()).deep.equal(end);
    });

    it('Should revert when User requests to lock their token, but Pool not started yet', async() => {
        const fromID = 1;
        const amount = 2;
        await heroes.mint(users[0].address, fromID, amount);
        await heroes.connect(users[0]).setApprovalForAll(lp.address, true);
        
        for (let i = 0; i < amount; i++)
            expect( await heroes.ownerOf(fromID+i) ).deep.equal(users[0].address);

        const tokenIDs = [...Array(amount).keys()].map(v => BigNumber.from(v + fromID))
        const username = "Tester 1"

        const info = await lp.getLockingInfo(users[0].address);

        await expect(
            lp.connect(users[0]).lock(username, tokenIDs)
        ).to.be.revertedWith('Pool not started yet');

        for (let i = 0; i < amount; i++)
            expect( await heroes.ownerOf(fromID+i) ).deep.equal(users[0].address);

        expect( await lp.getLockingInfo(users[0].address) ).deep.equal( info );
    });

    it('Should succeed when User requests to lock their token', async() => {
        const fromID = 3;
        const amount = 3;
        await heroes.mint(users[0].address, fromID, amount);
        await heroes.connect(users[0]).setApprovalForAll(lp.address, true);
        
        for (let i = 0; i < amount; i++)
            expect( await heroes.ownerOf(fromID+i) ).deep.equal(users[0].address);

        const block = await ethers.provider.getBlockNumber();
        timestamp = (await ethers.provider.getBlock(block)).timestamp;

        if (timestamp < start) {
            await network.provider.send("evm_setNextBlockTimestamp", [start])
            await network.provider.send("evm_mine")
        }

        const tokenIDs = [...Array(amount).keys()].map(v => BigNumber.from(v + fromID))
        const username = "Tester 1"
        
        const currentLock = await lp.totalLocking();

        const tx = await lp.connect(users[0]).lock(username, tokenIDs);
        const receipt = await tx.wait();
        const event = receipt.events.find(e => { return e.event == 'Locked' });

        expect(event != undefined).true;
        expect(event.args.user).deep.equal(users[0].address);

        expect( (await lp.getLockingInfo(users[0].address)).username ).deep.equal( username );
        expect( (await lp.getLockingInfo(users[0].address)).tokenIDs ).deep.equal( tokenIDs );
        expect( await lp.totalLocking() ).deep.equal( currentLock.add(1) );
        expect( await lp.users(0) ).deep.equal( users[0].address );
    });

    it('Should revert when User requests to lock their token, but Address in use', async() => {
        const fromID = 6;
        const amount = 5;
        await heroes.mint(users[0].address, fromID, amount);
        await heroes.connect(users[0]).setApprovalForAll(lp.address, true);
        
        for (let i = 0; i < amount; i++)
            expect( await heroes.ownerOf(fromID+i) ).deep.equal(users[0].address);

        const tokenIDs = [...Array(amount).keys()].map(v => BigNumber.from(v + fromID))
        const username = "Tester 1"

        const currentLock = await lp.totalLocking();
        const info = await lp.getLockingInfo(users[0].address);

        await expect(
            lp.connect(users[0]).lock(username, tokenIDs)
        ).to.be.revertedWith('Address already in use');

        for (let i = 0; i < amount; i++)
            expect( await heroes.ownerOf(fromID+i) ).deep.equal(users[0].address);

        expect( await lp.getLockingInfo(users[0].address) ).deep.equal( info );
        expect( await lp.totalLocking() ).deep.equal( currentLock );
    });

    it('Should revert when User requests to lock their token, but locking amount invalid', async() => {
        const fromID = 11;
        const amount = 11;
        await heroes.mint(users[1].address, fromID, amount);
        await heroes.connect(users[1]).setApprovalForAll(lp.address, true);
        
        for (let i = 0; i < amount; i++)
            expect( await heroes.ownerOf(fromID+i) ).deep.equal(users[1].address);

        const tokenIDs = [...Array(amount).keys()].map(v => BigNumber.from(v + fromID))
        const username = "Tester 2"

        const currentLock = await lp.totalLocking();
        const info = await lp.getLockingInfo(users[1].address);

        await expect(
            lp.connect(users[1]).lock(username, tokenIDs)
        ).to.be.revertedWith('Invalid locking amount');

        for (let i = 0; i < amount; i++)
            expect( await heroes.ownerOf(fromID+i) ).deep.equal(users[1].address);

        expect( await lp.getLockingInfo(users[1].address) ).deep.equal( info );
        expect( await lp.totalLocking() ).deep.equal( currentLock );
    });

    it('Should revert when User requests to lock their token, but list empty', async() => {
        const fromID = 22;
        const amount = 4;
        await heroes.mint(users[1].address, fromID, amount);
        await heroes.connect(users[1]).setApprovalForAll(lp.address, true);
        
        for (let i = 0; i < amount; i++)
            expect( await heroes.ownerOf(fromID+i) ).deep.equal(users[1].address);

        const tokenIDs = [];
        const username = "Tester 2";

        const currentLock = await lp.totalLocking();
        const info = await lp.getLockingInfo(users[1].address);

        await expect(
            lp.connect(users[1]).lock(username, tokenIDs)
        ).to.be.revertedWith('Invalid locking amount');

        for (let i = 0; i < amount; i++)
            expect( await heroes.ownerOf(fromID+i) ).deep.equal(users[1].address);

        expect( await lp.getLockingInfo(users[1].address) ).deep.equal( info );
        expect( await lp.totalLocking() ).deep.equal( currentLock );
    });

    it('Should revert when User requests to lock their token, but tokenID not owned - All', async() => {
        const fromID = 26;
        const amount = 5;
        const anotherFromID = 6;
        await heroes.mint(users[1].address, fromID, amount);
        await heroes.connect(users[1]).setApprovalForAll(lp.address, true);
        
        for (let i = 0; i < amount; i++) {
            expect( await heroes.ownerOf(fromID+i) ).deep.equal(users[1].address);
            expect( await heroes.ownerOf(anotherFromID+i) ).deep.equal(users[0].address);
        }
            
        const tokenIDs = [...Array(amount).keys()].map(v => BigNumber.from(v + anotherFromID));
        const username = "Tester 2"

        const currentLock = await lp.totalLocking();
        const info = await lp.getLockingInfo(users[1].address);

        await expect(
            lp.connect(users[1]).lock(username, tokenIDs)
        ).to.be.revertedWith('TokenID not owned');

        for (let i = 0; i < amount; i++) {
            expect( await heroes.ownerOf(fromID+i) ).deep.equal(users[1].address);
            expect( await heroes.ownerOf(anotherFromID+i) ).deep.equal(users[0].address);
        }

        expect( await lp.getLockingInfo(users[1].address) ).deep.equal( info );
        expect( await lp.totalLocking() ).deep.equal( currentLock );
    });

    it('Should revert when User requests to lock their token, but tokenID not owned - One of them', async() => {
        const fromID = 31;
        const amount = 5;
        await heroes.mint(users[1].address, fromID, amount);
        await heroes.connect(users[1]).setApprovalForAll(lp.address, true);
        
        for (let i = 0; i < amount; i++)
            expect( await heroes.ownerOf(fromID+i) ).deep.equal(users[1].address);
        
        const tokenID = 6;
        expect( await heroes.ownerOf(tokenID) ).deep.equal(users[0].address);
            
        const tokenIDs = [26, 27, 7, 28, 29];
        const username = "Tester 2"

        const currentLock = await lp.totalLocking();
        const info = await lp.getLockingInfo(users[1].address);

        await expect(
            lp.connect(users[1]).lock(username, tokenIDs)
        ).to.be.revertedWith('TokenID not owned');

        for (let i = 0; i < amount; i++)
            expect( await heroes.ownerOf(fromID+i) ).deep.equal(users[1].address);
        expect( await heroes.ownerOf(tokenID) ).deep.equal(users[0].address);

        expect( await lp.getLockingInfo(users[1].address) ).deep.equal( info );
        expect( await lp.totalLocking() ).deep.equal( currentLock );
    });

    it('Should revert when User requests to lock their token, but not setApprovalForAll', async() => {
        const fromID = 36;
        const amount = 5;
        await heroes.mint(users[1].address, fromID, amount);
        await heroes.connect(users[1]).setApprovalForAll(lp.address, false);
        
        for (let i = 0; i < amount; i++)
            expect( await heroes.ownerOf(fromID+i) ).deep.equal(users[1].address);

        const tokenIDs = [...Array(amount).keys()].map(v => BigNumber.from(v + fromID))
        const username = "Tester 2"

        const currentLock = await lp.totalLocking();
        const info = await lp.getLockingInfo(users[1].address);

        await expect(
            lp.connect(users[1]).lock(username, tokenIDs)
        ).to.be.revertedWith('ERC721: caller is not token owner nor approved');

        for (let i = 0; i < amount; i++)
            expect( await heroes.ownerOf(fromID+i) ).deep.equal(users[1].address);

        expect( await lp.getLockingInfo(users[1].address) ).deep.equal( info );
        expect( await lp.totalLocking() ).deep.equal( currentLock );
    });

    it('Should succeed when User requests to lock their token', async() => {
        const fromID = 41;
        const amount = 5;
        await heroes.mint(users[1].address, fromID, amount);
        await heroes.connect(users[1]).setApprovalForAll(lp.address, true);
        
        for (let i = 0; i < amount; i++)
            expect( await heroes.ownerOf(fromID+i) ).deep.equal(users[1].address);

        const block = await ethers.provider.getBlockNumber();
        timestamp = (await ethers.provider.getBlock(block)).timestamp;

        if (timestamp < start) {
            await network.provider.send("evm_setNextBlockTimestamp", [start])
            await network.provider.send("evm_mine")
        }

        const tokenIDs = [...Array(amount).keys()].map(v => BigNumber.from(v + fromID))
        const username = "Tester 1"
        
        const currentLock = await lp.totalLocking();

        const tx = await lp.connect(users[1]).lock(username, tokenIDs);
        const receipt = await tx.wait();
        const event = receipt.events.find(e => { return e.event == 'Locked' });

        expect(event != undefined).true;
        expect(event.args.user).deep.equal(users[1].address);

        expect( (await lp.getLockingInfo(users[1].address)).username ).deep.equal( username );
        expect( (await lp.getLockingInfo(users[1].address)).tokenIDs ).deep.equal( tokenIDs );
        expect( await lp.totalLocking() ).deep.equal( currentLock.add(1) );
        expect( await lp.users(0) ).deep.equal( users[0].address );
        expect( await lp.users(1) ).deep.equal( users[1].address );
    });

    it('Should succeed when User requests to lock their token - Max amounts', async() => {
        const fromID = 51;
        const amount = 10;
        await heroes.mint(users[2].address, fromID, amount);
        await heroes.connect(users[2]).setApprovalForAll(lp.address, true);
        
        for (let i = 0; i < amount; i++)
            expect( await heroes.ownerOf(fromID+i) ).deep.equal(users[2].address);

        const block = await ethers.provider.getBlockNumber();
        timestamp = (await ethers.provider.getBlock(block)).timestamp;

        if (timestamp < start) {
            await network.provider.send("evm_setNextBlockTimestamp", [start])
            await network.provider.send("evm_mine")
        }

        const tokenIDs = [...Array(amount).keys()].map(v => BigNumber.from(v + fromID))
        const username = "Tester 1"
        
        const currentLock = await lp.totalLocking();

        const tx = await lp.connect(users[2]).lock(username, tokenIDs);
        const receipt = await tx.wait();
        const event = receipt.events.find(e => { return e.event == 'Locked' });

        expect(event != undefined).true;
        expect(event.args.user).deep.equal(users[2].address);

        expect( (await lp.getLockingInfo(users[2].address)).username ).deep.equal( username );
        expect( (await lp.getLockingInfo(users[2].address)).tokenIDs ).deep.equal( tokenIDs );
        expect( await lp.totalLocking() ).deep.equal( currentLock.add(1) );
        expect( await lp.users(0) ).deep.equal( users[0].address );
        expect( await lp.users(1) ).deep.equal( users[1].address );
        expect( await lp.users(2) ).deep.equal( users[2].address );
    });

    it('Should revert when User requests to claim tokens back, but not yet ready', async() => {
        const fromID = 3;
        const amount = 3;
        
        for (let i = 0; i < amount; i++)
            expect( await heroes.ownerOf(fromID+i) ).deep.equal(lp.address);

        const currentLock = await lp.totalLocking();
        const info = await lp.getLockingInfo(users[0].address);

        await expect(
            lp.connect(users[0]).claim()
        ).to.be.revertedWith('Not yet ready');

        for (let i = 0; i < amount; i++)
            expect( await heroes.ownerOf(fromID+i) ).deep.equal(lp.address);

        expect( await lp.getLockingInfo(users[0].address) ).deep.equal( info );
        expect( await lp.totalLocking() ).deep.equal( currentLock );
    });

    it('Should revert when User requests to claim tokens back, but record not found', async() => {
        const fromID = 61;
        const amount = 5;
        await heroes.mint(users[3].address, fromID, amount);
        await heroes.connect(users[3]).setApprovalForAll(lp.address, true);
        
        for (let i = 0; i < amount; i++)
            expect( await heroes.ownerOf(fromID+i) ).deep.equal(users[3].address);

        const block = await ethers.provider.getBlockNumber();
        timestamp = (await ethers.provider.getBlock(block)).timestamp;

        if (timestamp < end) {
            await network.provider.send("evm_setNextBlockTimestamp", [end])
            await network.provider.send("evm_mine")
        }

        const currentLock = await lp.totalLocking();
        const info = await lp.getLockingInfo(users[3].address);

        await expect(
            lp.connect(users[3]).claim()
        ).to.be.revertedWith('Not recorded or claimed already');

        for (let i = 0; i < amount; i++)
            expect( await heroes.ownerOf(fromID+i) ).deep.equal(users[3].address);

        expect( await lp.getLockingInfo(users[3].address) ).deep.equal( info );
        expect( await lp.totalLocking() ).deep.equal( currentLock );
        expect( await lp.users(0) ).deep.equal( users[0].address );
        expect( await lp.users(1) ).deep.equal( users[1].address );
        expect( await lp.users(2) ).deep.equal( users[2].address );
    });

    it('Should succeed when User requests to claim tokens back', async() => {
        const fromID = 3;
        const amount = 3;
        
        for (let i = 0; i < amount; i++)
            expect( await heroes.ownerOf(fromID+i) ).deep.equal(lp.address);

        const block = await ethers.provider.getBlockNumber();
        timestamp = (await ethers.provider.getBlock(block)).timestamp;

        if (timestamp < end) {
            await network.provider.send("evm_setNextBlockTimestamp", [end])
            await network.provider.send("evm_mine")
        }

        const currentLock = await lp.totalLocking();

        await lp.connect(users[0]).claim();

        for (let i = 0; i < amount; i++)
            expect( await heroes.ownerOf(fromID+i) ).deep.equal(users[0].address);

        expect( await lp.getLockingInfo(users[0].address) ).deep.equal( emptyInfo );
        expect( await lp.totalLocking() ).deep.equal( currentLock.sub(1) );
        expect( await lp.users(0) ).deep.equal( users[2].address );
        expect( await lp.users(1) ).deep.equal( users[1].address );
    });

    it('Should revert when User requests to claim tokens back, but claimed already', async() => {
        const fromID = 3;
        const amount = 3;
        
        for (let i = 0; i < amount; i++)
            expect( await heroes.ownerOf(fromID+i) ).deep.equal(users[0].address);

        const block = await ethers.provider.getBlockNumber();
        timestamp = (await ethers.provider.getBlock(block)).timestamp;

        if (timestamp < end) {
            await network.provider.send("evm_setNextBlockTimestamp", [end])
            await network.provider.send("evm_mine")
        }

        const currentLock = await lp.totalLocking();
        expect( await lp.getLockingInfo(users[0].address) ).deep.equal( emptyInfo );

        await expect(
            lp.connect(users[0]).claim()
        ).to.be.revertedWith('Not recorded or claimed already');

        for (let i = 0; i < amount; i++)
            expect( await heroes.ownerOf(fromID+i) ).deep.equal(users[0].address);

        expect( await lp.getLockingInfo(users[0].address) ).deep.equal( emptyInfo );
        expect( await lp.totalLocking() ).deep.equal( currentLock );
        expect( await lp.users(0) ).deep.equal( users[2].address );
        expect( await lp.users(1) ).deep.equal( users[1].address );
    });

    it('Should succeed when User requests to claim tokens back', async() => {
        const fromID = 51;
        const amount = 10;
        
        for (let i = 0; i < amount; i++)
            expect( await heroes.ownerOf(fromID+i) ).deep.equal(lp.address);

        const block = await ethers.provider.getBlockNumber();
        timestamp = (await ethers.provider.getBlock(block)).timestamp;

        if (timestamp < end) {
            await network.provider.send("evm_setNextBlockTimestamp", [end])
            await network.provider.send("evm_mine")
        }

        const currentLock = await lp.totalLocking();

        await lp.connect(users[2]).claim();

        for (let i = 0; i < amount; i++)
            expect( await heroes.ownerOf(fromID+i) ).deep.equal(users[2].address);

        expect( await lp.getLockingInfo(users[0].address) ).deep.equal( emptyInfo );
        expect( await lp.totalLocking() ).deep.equal( currentLock.sub(1) );
        expect( await lp.users(0) ).deep.equal( users[1].address );
    });

    it('Should revert when Non-manager role tries to call release()', async() => {
        const fromID = 41;
        const amount = 5;
        
        for (let i = 0; i < amount; i++)
            expect( await heroes.ownerOf(fromID+i) ).deep.equal(lp.address);

        const block = await ethers.provider.getBlockNumber();
        timestamp = (await ethers.provider.getBlock(block)).timestamp;

        if (timestamp < end) {
            await network.provider.send("evm_setNextBlockTimestamp", [end])
            await network.provider.send("evm_mine")
        }

        const currentLock = await lp.totalLocking();
        const info = await lp.getLockingInfo(users[1].address);

        await expect(
            lp.connect(users[1]).release(heroes.address, users[1].address)
        ).to.be.revertedWith('Caller is not Manager');

        for (let i = 0; i < amount; i++)
            expect( await heroes.ownerOf(fromID+i) ).deep.equal(lp.address);

        expect( await lp.getLockingInfo(users[1].address) ).deep.equal( info );
        expect( await lp.totalLocking() ).deep.equal( currentLock );
        expect( await lp.users(0) ).deep.equal( users[1].address );
    });

    it('Should succeed when Manager role tries to set the information of LockPool with valid settings', async() => {
        expect(await lp.token()).deep.equal(heroes.address);
        expect(await lp.start()).deep.equal(start);
        expect(await lp.end()).deep.equal(end);

        const block = await provider.getBlockNumber();
        timestamp = (await provider.getBlock(block)).timestamp;

        const new_start = timestamp + 3 * 24 * 3600;    
        const new_end = timestamp + 33 * 24 * 3600 

        await lp.connect(manager).setLockPool(heroes.address, new_start, new_end)

        expect(await lp.token()).deep.equal(heroes.address);
        expect(await lp.start()).deep.equal(new_start);
        expect(await lp.end()).deep.equal(new_end);
    });

    it('Should revert when User tries to claim tokens back, but a new locking pool has been set', async() => {
        const fromID = 41;
        const amount = 5;
        
        for (let i = 0; i < amount; i++)
            expect( await heroes.ownerOf(fromID+i) ).deep.equal(lp.address);

        const block = await ethers.provider.getBlockNumber();
        timestamp = (await ethers.provider.getBlock(block)).timestamp;

        if (timestamp < end) {
            await network.provider.send("evm_setNextBlockTimestamp", [end])
            await network.provider.send("evm_mine")
        }

        const currentLock = await lp.totalLocking();
        const info = await lp.getLockingInfo(users[1].address);

        await expect(
            lp.connect(users[1]).claim()
        ).to.be.revertedWith('Not yet ready');

        for (let i = 0; i < amount; i++)
            expect( await heroes.ownerOf(fromID+i) ).deep.equal(lp.address);

        expect( await lp.getLockingInfo(users[1].address) ).deep.equal( info );
        expect( await lp.totalLocking() ).deep.equal( currentLock );
        expect( await lp.users(0) ).deep.equal( users[1].address );
    });

    it('Should succeed when User requests to lock their token', async() => {
        const block = await ethers.provider.getBlockNumber();
        timestamp = (await ethers.provider.getBlock(block)).timestamp;
        
        start = (await lp.start() ).toNumber();
        end = ( await lp.end() ).toNumber();

        if (timestamp < start) {
            await network.provider.send("evm_setNextBlockTimestamp", [start])
            await network.provider.send("evm_mine")
        }

        const fromID = 100;
        const amount = 10;
        let currentLock;    let tokenIDs;   let username;

        for (let i = 0; i < 10; i++) {
            currentLock = await lp.totalLocking();

            await heroes.mint(users[i+4].address, fromID + amount * i, amount);
            await heroes.connect(users[i+4]).setApprovalForAll(lp.address, true);

            for (let j = 0; j < amount; j++)
                expect( await heroes.ownerOf(fromID + amount * i + j) ).deep.equal(users[i+4].address);
            
            tokenIDs = [...Array(amount).keys()].map(v => BigNumber.from(v + fromID + amount * i))
            username = "Tester 1";

            await lp.connect(users[i+4]).lock(username, tokenIDs);

            expect( (await lp.getLockingInfo(users[i+4].address)).username ).deep.equal( username );
            expect( (await lp.getLockingInfo(users[i+4].address)).tokenIDs ).deep.equal( tokenIDs );
            expect( await lp.totalLocking() ).deep.equal( currentLock.add(1) );
        }

        expect( await lp.users(0) ).deep.equal( users[1].address );
        for (let i = 0; i < 10; i++)
            expect( await lp.users(i+1) ).deep.equal( users[i+4].address );
    });

    it('Should succeed when Manager role tries to call release()', async() => {
        const fromID = 41;
        const amount = 5;
        
        for (let i = 0; i < amount; i++)
            expect( await heroes.ownerOf(fromID+i) ).deep.equal(lp.address);

        const currentLock = await lp.totalLocking();
        expect( await lp.users(0) ).deep.equal( users[1].address );

        await lp.connect(manager).release(heroes.address, users[1].address)

        for (let i = 0; i < amount; i++)
            expect( await heroes.ownerOf(fromID+i) ).deep.equal(users[1].address);

        expect( await lp.getLockingInfo(users[1].address) ).deep.equal( emptyInfo );
        expect( await lp.totalLocking() ).deep.equal( currentLock.sub(1) );
    });

});