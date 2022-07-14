const chai = require('chai');
const chaiAsPromise = require('chai-as-promised');
const { utils, BigNumber } = require('ethers');

chai.use(chaiAsPromise);
const expect = chai.expect;
const days = 24 * 3600;

function keccak256(data) {
    return utils.keccak256(data);
}

function array_range(start, end) {
    return Array(end - start + 1).fill().map((_, idx) => start + idx)
}

const MANAGER_ROLE = keccak256(utils.toUtf8Bytes("MANAGER_ROLE"));
const MINTER_ROLE = keccak256(utils.toUtf8Bytes("MINTER_ROLE"));

describe('EPLHeroes Contract Testing', () => {
    let admin, manager, minter, treasury, receiver;
    let gov, heroes, rental;

    const MAX_SUPPLY = 5000;
    const baseURI = 'https://empire-land.io/nft/';

    before(async() => {
        [admin, manager, minter, treasury, receiver] = await ethers.getSigners();

        const GOV = await ethers.getContractFactory('EPLManagement', admin);
        gov = await GOV.deploy(treasury.address);

        const Heroes = await ethers.getContractFactory('EPLHeroes', admin);
        heroes = await Heroes.deploy(gov.address, baseURI);

        const Rental = await ethers.getContractFactory('Rental', admin);
        rental = await Rental.deploy(gov.address);

        await gov.connect(admin).grantRole(MANAGER_ROLE, manager.address);
        await gov.connect(admin).grantRole(MINTER_ROLE, minter.address);

        await gov.connect(manager).addToList(heroes.address);
        await heroes.connect(manager).setRental(rental.address);
    });

    it('Should be able to query initialized settings', async() => {
        expect(await heroes.gov()).deep.equal(gov.address);
        expect(await heroes.MAX_SUPPLY()).deep.equal(MAX_SUPPLY);
        expect(await heroes.minted()).deep.equal(ethers.constants.Zero);
        expect(await heroes.burned()).deep.equal(ethers.constants.Zero);
        expect(await heroes.baseURI()).deep.equal(baseURI);
        expect(await heroes.disabled()).deep.equal(false);
    });

    it('Should revert when Non-Manager Role tries to update a new baseURI', async() => {
        expect(await heroes.baseURI()).deep.equal(baseURI);

        const newBaseURI = 'https://empire-land.io/nft/new/';
        await expect(
            heroes.connect(admin).updateBaseURI(newBaseURI)
        ).to.be.revertedWith('Caller is not Manager');
        
        expect(await heroes.baseURI()).deep.equal(baseURI);
    });

    it('Should revert when Manager tries to update new baseURI, but empty', async() => {
        expect(await heroes.baseURI()).deep.equal(baseURI);

        const newBaseURI = '';
        await expect(
            heroes.connect(manager).updateBaseURI(newBaseURI)
        ).to.be.revertedWith('Empty URI');

        expect(await heroes.baseURI()).deep.equal(baseURI);
    });

    it('Should be able to update new baseURI as Manager Role', async() => {
        expect(await heroes.baseURI()).deep.equal(baseURI);

        const newBaseURI = 'https://empire-land.io/nft/new/';
        await heroes.connect(manager).updateBaseURI(newBaseURI);
        expect(await heroes.baseURI()).deep.equal(newBaseURI);

        //  set back to normal
        await heroes.connect(manager).updateBaseURI(baseURI);
        expect(await heroes.baseURI()).deep.equal(baseURI);
    });

    it('Should revert when Non-Minter role tries to call breed()', async() => {
        expect(await heroes.balanceOf(manager.address)).deep.equal(ethers.constants.Zero);

        const fromID = 1;
        const amount = 50;
        await expect(
            heroes.connect(admin).breed(manager.address, fromID, amount)
        ).to.be.revertedWith('Caller is not Minter');

        expect(await heroes.balanceOf(manager.address)).deep.equal(ethers.constants.Zero);
    });

    it('Should succeed when Minter role calls breed() and mint Heroes to Manager', async() => {
        let balance = await heroes.balanceOf(manager.address);
        expect(balance).deep.equal(ethers.constants.Zero);

        let nonces = [];
        const fromID = 1;       const amount = 50;
        const tokenIDs = [1, 25, 50];
        tokenIDs.map(async id => {
            nonces.push(await heroes.nonces(id, manager.address))
        });

        const tx = await heroes.connect(minter).breed(manager.address, fromID, amount);
        const receipt = await tx.wait();
        const event = receipt.events.find(e => { return e.event == 'GiveBirth' });

        expect(event != undefined).true;
        expect(event.args.to).deep.equal(manager.address);
        expect(event.args.fromID).deep.equal(fromID);
        expect(event.args.toID).deep.equal(fromID + amount - 1);
        
        expect(await heroes.balanceOf(manager.address)).deep.equal(amount);
        tokenIDs.map(async (id, index) => {
            expect(await heroes.ownerOf(id)).deep.equal(manager.address);
            expect(await heroes.nonces(id, manager.address)).deep.equal( nonces[index].add(1) )
        });
        expect(await heroes.minted()).deep.equal(amount);
    });

    it('Should succeed query a list of owned tokens by Manager', async() => {
        const tokens = array_range(1, 50).map(value => { return BigNumber.from(value) });
        const fromIdx = 0;
        const toIdx = (await heroes.balanceOf(manager.address)).add(fromIdx).sub(1);

        expect( await heroes.tokensByOwner(manager.address, fromIdx, toIdx) ).deep.equal(tokens);
    })

    it('Should succeed query a list of owned tokens by Manager', async() => {
        const tokens = [BigNumber.from(11)]
        const fromIdx = 10;
        const toIdx = 10;

        expect( await heroes.tokensByOwner(manager.address, fromIdx, toIdx) ).deep.equal(tokens);
    })

    it('Should revert when querying a list of owned tokens, but `toIdx` < `fromIdx`', async() => {
        const fromIdx = 10;
        const toIdx = 9;

        await expect(
            heroes.tokensByOwner(manager.address, fromIdx, toIdx)
        ).to.be.revertedWith('');
    })

    it('Should succeed when Minter role calls breed() and mint Heroes to Receiver', async() => {
        let balance = await heroes.balanceOf(receiver.address);
        let minted = await heroes.minted();
        expect(balance).deep.equal(ethers.constants.Zero);

        const fromID = 51;
        const amount = 10;
        const tx = await heroes.connect(minter).breed(receiver.address, fromID, amount);
        const receipt = await tx.wait();
        const event = receipt.events.find(e => { return e.event == 'GiveBirth' });

        expect(event != undefined).true;
        expect(event.args.to).deep.equal(receiver.address);
        expect(event.args.fromID).deep.equal(fromID);
        expect(event.args.toID).deep.equal(fromID + amount - 1);
        
        const tokenIDs = [51, 55, 60];
        expect(await heroes.balanceOf(receiver.address)).deep.equal(amount);
        tokenIDs.map(async id => {
            expect(await heroes.ownerOf(id)).deep.equal(receiver.address);
        });
        expect(await heroes.minted()).deep.equal(minted.add(amount));
    });

    it('Should succeed query a list of owned tokens by Receiver', async() => {
        const tokens = array_range(51, 60).map(value => { return BigNumber.from(value) });
        const fromIdx = 0;
        const toIdx = (await heroes.balanceOf(receiver.address)).add(fromIdx).sub(1);

        expect( await heroes.tokensByOwner(receiver.address, fromIdx, toIdx) ).deep.equal(tokens);
    })

    it('Should revert when querying a list of owned tokens, but out of bound', async() => {
        //  Manager owns 50 Heroes - index = [0:49], tokenIDs = [1:50]
        //  Receiver owns 10 Heroes - index = [0:9], tokenIDs = [51:60]
        const fromIdx = 0;
        const toIdx = 50;

        await expect(
            heroes.tokensByOwner(receiver.address, fromIdx, toIdx)
        ).to.be.revertedWith('ERC721Enumerable: owner index out of bounds');
    })

    it('Should revert when Minter role calls breed() and mint Heroes to Manager, but tokenID already minted', async() => {
        let balance = await heroes.balanceOf(manager.address);
        let minted = await heroes.minted();

        let nonces1 = [];       let nonces2 = [];
        const fromID = 51;      const amount = 50;
        let tokenIDs = [51, 55, 60];
        tokenIDs.map(async id => {
            nonces1.push(await heroes.nonces(id, manager.address));
            nonces2.push(await heroes.nonces(id, receiver.address));
        });

        await expect(
            heroes.connect(minter).breed(manager.address, fromID, amount)
        ).to.be.revertedWith('ERC721: token already minted');

        tokenIDs.map(async (id, index) => {
            expect(await heroes.nonces(id, manager.address)).deep.equal(nonces1[index]);
            expect(await heroes.nonces(id, receiver.address)).deep.equal(nonces2[index]);
            expect(await heroes.ownerOf(id)).deep.equal(receiver.address);
        });

        tokenIDs = [61, 75, 100];
        tokenIDs.map(async id => {
            await expect(
                heroes.ownerOf(id)
            ).to.be.revertedWith('ERC721: invalid token ID');
        });
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance);
        expect(await heroes.minted()).deep.equal(minted);
    });

    it('Should revert when Minter role calls breed() and mint Heroes to Receiver, but tokenID already minted', async() => {
        let balance = await heroes.balanceOf(receiver.address);
        let minted = await heroes.minted();

        const fromID = 51;
        const amount = 50;
        await expect(
            heroes.connect(minter).breed(receiver.address, fromID, amount)
        ).to.be.revertedWith('ERC721: token already minted');
        
        
        let tokenIDs = [51, 55, 60];
        expect(await heroes.balanceOf(receiver.address)).deep.equal(balance);
        expect(await heroes.minted()).deep.equal(minted);
        tokenIDs.map(async id => {
            expect(await heroes.ownerOf(id)).deep.equal(receiver.address);
        });
        tokenIDs = [61, 75, 100];
        tokenIDs.map(async id => {
            await expect(
                heroes.ownerOf(id)
            ).to.be.revertedWith('ERC721: invalid token ID');
        });
    });

    it('Should succeed when Minter role calls breed() and mint extra Heroes to Receiver', async() => {
        let balance = await heroes.balanceOf(receiver.address);
        let minted = await heroes.minted();

        const fromID = 81;
        const amount = 20;
        const tx = await heroes.connect(minter).breed(receiver.address, fromID, amount);
        const receipt = await tx.wait();
        const event = receipt.events.find(e => { return e.event == 'GiveBirth' });

        expect(event != undefined).true;
        expect(event.args.to).deep.equal(receiver.address);
        expect(event.args.fromID).deep.equal(fromID);
        expect(event.args.toID).deep.equal(fromID + amount - 1);
        
        const tokenIDs = [81, 90, 100];
        expect(await heroes.balanceOf(receiver.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));
        tokenIDs.map(async id => {
            expect(await heroes.ownerOf(id)).deep.equal(receiver.address);
        });
    });

    it('Should revert when Minter role calls breed() and mint Heroes to Manager, but tokenID already minted', async() => {
        let balance = await heroes.balanceOf(manager.address);
        let minted = await heroes.minted();

        const fromID = 61;
        const amount = 21;
        await expect(
            heroes.connect(minter).breed(manager.address, fromID, amount)
        ).to.be.revertedWith('ERC721: token already minted');
        
        const tokenID1 = 81;
        expect(await heroes.ownerOf(tokenID1)).deep.equal(receiver.address);

        const tokenIDs = [61, 71, 80];
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance);
        expect(await heroes.minted()).deep.equal(minted);
        tokenIDs.map(async id => {
            await expect(
                heroes.ownerOf(id)
            ).to.be.revertedWith('ERC721: invalid token ID');
        });
    });

    it('Should revert when Minter role calls breed() and mint Heroes to Receiver, but tokenID already minted', async() => {
        let balance = await heroes.balanceOf(receiver.address);
        let minted = await heroes.minted();

        const fromID = 61;
        const amount = 21;
        await expect(
            heroes.connect(minter).breed(receiver.address, fromID, amount)
        ).to.be.revertedWith('ERC721: token already minted');
        
        const tokenID1 = 81;
        expect(await heroes.ownerOf(tokenID1)).deep.equal(receiver.address);

        const tokenIDs = [61, 71, 80];
        expect(await heroes.balanceOf(receiver.address)).deep.equal(balance);
        expect(await heroes.minted()).deep.equal(minted);
        tokenIDs.map(async id => {
            await expect(
                heroes.ownerOf(id)
            ).to.be.revertedWith('ERC721: invalid token ID');
        });
    });

    it('Should succeed when Minter role calls breed() and mint extra Heroes to Manager', async() => {
        let balance = await heroes.balanceOf(manager.address);
        let minted = await heroes.minted();

        const fromID = 61;
        const amount = 20;
        const tx = await heroes.connect(minter).breed(manager.address, fromID, amount);
        const receipt = await tx.wait();
        const event = receipt.events.find(e => { return e.event == 'GiveBirth' });

        expect(event != undefined).true;
        expect(event.args.to).deep.equal(manager.address);
        expect(event.args.fromID).deep.equal(fromID);
        expect(event.args.toID).deep.equal(fromID + amount - 1);
        
        const tokenIDs = [61, 71, 80];
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));
        tokenIDs.map(async id => {
            expect(await heroes.ownerOf(tokenID1)).deep.equal(manager.address)
        }); 
    });

    it('Should revert when Manager calls cremation() to burn Heroes, but empty list', async() => {
        let balance = await heroes.balanceOf(manager.address);
        let minted = await heroes.minted();
        let burned = await heroes.burned();

        const emptyList = [];
        await expect(
            heroes.connect(manager).cremation(emptyList)
        ).to.be.revertedWith('Burning amount is zero');

        expect(await heroes.balanceOf(manager.address)).deep.equal(balance);
        expect(await heroes.minted()).deep.equal(minted);
        expect(await heroes.burned()).deep.equal(burned);
    });

    it('Should revert when Manager calls cremation() to burn Heroes, but Heroes not owned', async() => {
        let balance = await heroes.balanceOf(manager.address);
        let minted = await heroes.minted();
        let burned = await heroes.burned();

        const tokenIDs = [51, 52, 60];
        tokenIDs.map(async id => {
            expect(await heroes.ownerOf(id)).deep.equal(receiver.address);
        });

        await expect(
            heroes.connect(manager).cremation(tokenIDs)
        ).to.be.revertedWith('Hero not owned');

        expect(await heroes.balanceOf(manager.address)).deep.equal(balance);
        expect(await heroes.minted()).deep.equal(minted);
        expect(await heroes.burned()).deep.equal(burned);
        tokenIDs.map(async id => {
            expect(await heroes.ownerOf(id)).deep.equal(receiver.address);
        });
    });

    it('Should revert when Manager calls cremation() to burn Heroes, but Heroes not owned', async() => {
        let balance = await heroes.balanceOf(manager.address);
        let minted = await heroes.minted();
        let burned = await heroes.burned();

        const tokenIDs = [60, 61, 80];
        tokenIDs.map(async (id, index) => {
            if (index == 0)
                expect(await heroes.ownerOf(id)).deep.equal(receiver.address)
            else
                expect(await heroes.ownerOf(id)).deep.equal(manager.address)
        });

        await expect(
            heroes.connect(manager).cremation(tokenIDs)
        ).to.be.revertedWith('Hero not owned');

        expect(await heroes.balanceOf(manager.address)).deep.equal(balance);
        expect(await heroes.minted()).deep.equal(minted);
        expect(await heroes.burned()).deep.equal(burned);
        tokenIDs.map(async (id, index) => {
            if (index == 0)
                expect(await heroes.ownerOf(id)).deep.equal(receiver.address)
            else
                expect(await heroes.ownerOf(id)).deep.equal(manager.address)
        });
    });

    it('Should revert when Manager calls cremation() to burn Heroes, but Heroes not existed', async() => {
        let balance = await heroes.balanceOf(manager.address);
        let minted = await heroes.minted();
        let burned = await heroes.burned();

        const tokenIDs = [101, 102, 103];
        tokenIDs.map(async id => {
            await expect(
                heroes.ownerOf(id)
            ).to.be.revertedWith('ERC721: invalid token ID');
        });

        await expect(
            heroes.connect(manager).cremation(tokenIDs)
        ).to.be.revertedWith('ERC721: invalid token ID');

        expect(await heroes.balanceOf(manager.address)).deep.equal(balance);
        expect(await heroes.minted()).deep.equal(minted);
        expect(await heroes.burned()).deep.equal(burned);
        tokenIDs.map(async id => {
            await expect(
                heroes.ownerOf(id)
            ).to.be.revertedWith('ERC721: invalid token ID');
        });
    });

    it('Should revert when Receiver calls cremation() to burn Heroes, but empty list', async() => {
        let balance = await heroes.balanceOf(receiver.address);
        let minted = await heroes.minted();
        let burned = await heroes.burned();

        const emptyList = [];
        await expect(
            heroes.connect(receiver).cremation(emptyList)
        ).to.be.revertedWith('Burning amount is zero');

        expect(await heroes.balanceOf(receiver.address)).deep.equal(balance);
        expect(await heroes.minted()).deep.equal(minted);
        expect(await heroes.burned()).deep.equal(burned);
    });

    it('Should revert when Receiver calls cremation() to burn Heroes, but Heroes not owned', async() => {
        let balance = await heroes.balanceOf(receiver.address);
        let minted = await heroes.minted();
        let burned = await heroes.burned();

        const tokenIDs = [10, 61, 80];
        tokenIDs.map(async id => {
            expect(await heroes.ownerOf(id)).deep.equal(manager.address)
        });

        await expect(
            heroes.connect(receiver).cremation(tokenIDs)
        ).to.be.revertedWith('Hero not owned');

        expect(await heroes.balanceOf(receiver.address)).deep.equal(balance);
        expect(await heroes.minted()).deep.equal(minted);
        expect(await heroes.burned()).deep.equal(burned);
        tokenIDs.map(async id => {
            expect(await heroes.ownerOf(id)).deep.equal(manager.address)
        });
    });

    it('Should revert when Receiver calls cremation() to burn Heroes, but Heroes not owned', async() => {
        let balance = await heroes.balanceOf(receiver.address);
        let minted = await heroes.minted();
        let burned = await heroes.burned();

        const tokenIDs = [51, 90, 75];
        tokenIDs.map(async (id, index) => {
            if (index == 2)
                expect(await heroes.ownerOf(id)).deep.equal(manager.address)
            else
                expect(await heroes.ownerOf(id)).deep.equal(receiver.address);
        });

        await expect(
            heroes.connect(receiver).cremation(tokenIDs)
        ).to.be.revertedWith('Hero not owned');

        expect(await heroes.balanceOf(receiver.address)).deep.equal(balance);
        expect(await heroes.minted()).deep.equal(minted);
        expect(await heroes.burned()).deep.equal(burned);
        tokenIDs.map(async (id, index) => {
            if (index == 2)
                expect(await heroes.ownerOf(id)).deep.equal(manager.address)
            else
                expect(await heroes.ownerOf(id)).deep.equal(receiver.address);
        });
    });

    it('Should revert when Receiver calls cremation() to burn Heroes, but Heroes not existed', async() => {
        let balance = await heroes.balanceOf(receiver.address);
        let minted = await heroes.minted();
        let burned = await heroes.burned();

        const tokenIDs = [101, 102, 103];
        tokenIDs.map(async id => {
            await expect(
                heroes.ownerOf(id)
            ).to.be.revertedWith('ERC721: invalid token ID');
        });
    
        await expect(
            heroes.connect(receiver).cremation(tokenIDs)
        ).to.be.revertedWith('ERC721: invalid token ID');

        expect(await heroes.balanceOf(receiver.address)).deep.equal(balance);
        expect(await heroes.minted()).deep.equal(minted);
        expect(await heroes.burned()).deep.equal(burned);
        tokenIDs.map(async id => {
            await expect(
                heroes.ownerOf(id)
            ).to.be.revertedWith('ERC721: invalid token ID');
        });
    });

    it('Should succeed when Manager calls cremation() to burn its Heroes', async() => {
        let balance = await heroes.balanceOf(manager.address);
        let minted = await heroes.minted();
        let burned = await heroes.burned();

        const tokenIDs = [BigNumber.from(10), BigNumber.from(61), BigNumber.from(80)];
        tokenIDs.map(async id => {
            expect(await heroes.ownerOf(id)).deep.equal(manager.address)
        });

        const tx = await heroes.connect(manager).cremation(tokenIDs)
        const receipt = await tx.wait();
        const event = receipt.events.find(e => { return e.event == 'ToTheAsh' });

        expect(event != undefined).true;
        expect(event.args.from).deep.equal(manager.address);
        expect(event.args.IDs).deep.equal(tokenIDs);

        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.sub(tokenIDs.length));
        expect(await heroes.minted()).deep.equal(minted);       //  `minted` not decreased
        expect(await heroes.burned()).deep.equal(burned.add(tokenIDs.length));
        tokenIDs.map(async id => {
            await expect(
                heroes.ownerOf(id)
            ).to.be.revertedWith('ERC721: invalid token ID');
        });
    });

    it('Should succeed when Receiver calls cremation() to burn its Heroes', async() => {
        let balance = await heroes.balanceOf(receiver.address);
        let minted = await heroes.minted();
        let burned = await heroes.burned();

        const tokenIDs = [BigNumber.from(51), BigNumber.from(85), BigNumber.from(100)];
        tokenIDs.map(async id => {
            expect(await heroes.ownerOf(id)).deep.equal(receiver.address)
        });

        const tx = await heroes.connect(receiver).cremation(tokenIDs);
        const receipt = await tx.wait();
        const event = receipt.events.find(e => { return e.event == 'ToTheAsh' });

        expect(event != undefined).true;
        expect(event.args.from).deep.equal(receiver.address);
        expect(event.args.IDs).deep.equal(tokenIDs);

        expect(await heroes.balanceOf(receiver.address)).deep.equal(balance.sub(tokenIDs.length));
        expect(await heroes.minted()).deep.equal(minted);       //  `minted` not decreased
        expect(await heroes.burned()).deep.equal(burned.add(tokenIDs.length));
        tokenIDs.map(async id => {
            await expect(
                heroes.ownerOf(id)
            ).to.be.revertedWith('ERC721: invalid token ID');
        });
    });

    it('Should revert when Manager calls cremation() to burn Heroes, but Heroes already burned', async() => {
        let balance = await heroes.balanceOf(manager.address);
        let minted = await heroes.minted();
        let burned = await heroes.burned();

        const tokenIDs = [10, 61, 80];
        tokenIDs.map(async id => {
            await expect(
                heroes.ownerOf(id)
            ).to.be.revertedWith('ERC721: invalid token ID');
        });

        await expect(
            heroes.connect(manager).cremation(tokenIDs)
        ).to.be.revertedWith('ERC721: invalid token ID');

        expect(await heroes.balanceOf(manager.address)).deep.equal(balance);
        expect(await heroes.minted()).deep.equal(minted);
        expect(await heroes.burned()).deep.equal(burned);
        tokenIDs.map(async id => {
            await expect(
                heroes.ownerOf(id)
            ).to.be.revertedWith('ERC721: invalid token ID');
        });
    });
    
    it('Should revert when Receiver calls cremation() to burn Heroes, but Heroes already burned', async() => {
        let balance = await heroes.balanceOf(receiver.address);
        let minted = await heroes.minted();
        let burned = await heroes.burned();

        const tokenIDs = [51, 85, 10];
        tokenIDs.map(async id => {
            await expect(
                heroes.ownerOf(id)
            ).to.be.revertedWith('ERC721: invalid token ID');
        });

        await expect(
            heroes.connect(receiver).cremation(tokenIDs)
        ).to.be.revertedWith('ERC721: invalid token ID');

        expect(await heroes.balanceOf(receiver.address)).deep.equal(balance);
        expect(await heroes.minted()).deep.equal(minted);
        expect(await heroes.burned()).deep.equal(burned);
        tokenIDs.map(async id => {
            await expect(
                heroes.ownerOf(id)
            ).to.be.revertedWith('ERC721: invalid token ID');
        });
    });

    it('Should succeed when Minter role calls breed() and mint extra 900 Heroes to Manager', async() => {
        let balance = await heroes.balanceOf(manager.address);
        let minted = await heroes.minted();
        let amount = 100;

        let fromID = 101;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 201;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 301;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 401;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 501;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 601;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 701;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 801;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 901;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));
    });

    it('Should succeed when Minter role calls breed() and mint extra 1,000 Heroes to Manager', async() => {
        let balance = await heroes.balanceOf(manager.address);
        let minted = await heroes.minted();
        const amount = 100;

        let fromID = 1001;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 1101;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 1201;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 1301;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 1401;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 1501;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 1601;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 1701;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 1801;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 1901;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));
    });

    it('Should succeed when Minter role calls breed() and mint extra 1,000 Heroes to Manager', async() => {
        let balance = await heroes.balanceOf(manager.address);
        let minted = await heroes.minted();
        const amount = 100;

        let fromID = 2001;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 2101;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 2201;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 2301;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 2401;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 2501;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 2601;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 2701;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 2801;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 2901;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));
    });

    it('Should succeed when Minter role calls breed() and mint extra 1,000 Heroes to Manager', async() => {
        let balance = await heroes.balanceOf(manager.address);
        let minted = await heroes.minted();
        const amount = 100;

        let fromID = 3001;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 3101;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 3201;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 3301;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 3401;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 3501;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 3601;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 3701;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 3801;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 3901;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));
    });

    it('Should succeed when Minter role calls breed() and mint extra 1,000 Heroes to Manager', async() => {
        let balance = await heroes.balanceOf(manager.address);
        let minted = await heroes.minted();
        const amount = 100;

        let fromID = 4001;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 4101;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 4201;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 4301;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 4401;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 4501;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 4601;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 4701;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 4801;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));

        balance = await heroes.balanceOf(manager.address);
        minted = await heroes.minted();
        fromID = 4901;
        await heroes.connect(minter).breed(manager.address, fromID, amount);
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.add(amount));
        expect(await heroes.minted()).deep.equal(minted.add(amount));
    });

    it('Should revert when Minter role calls breed() and mint extra Heroes to Manager, but MAX_SUPPLY reached', async() => {
        let balance = await heroes.balanceOf(manager.address);
        let minted = await heroes.minted();
        expect(minted).deep.equal(MAX_SUPPLY);

        const fromID = 5001;
        const amount = 2;       //  already burned 6 Heroes
        const tokenIDs = [5001, 5002];
        tokenIDs.map(async id => {
            await expect(
                heroes.ownerOf(id)
            ).to.be.revertedWith('ERC721: invalid token ID');
        });

        await expect(
            heroes.connect(minter).breed(manager.address, fromID, amount)
        ).to.be.revertedWith('Exceed MAX_SUPPLY');
        
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance);
        expect(await heroes.minted()).deep.equal(minted);
        tokenIDs.map(async id => {
            await expect(
                heroes.ownerOf(id)
            ).to.be.revertedWith('ERC721: invalid token ID');
        });
    });

    it('Should revert when Minter role calls breed() and mint extra Heroes to Receiver, but MAX_SUPPLY reached', async() => {
        let balance = await heroes.balanceOf(receiver.address);
        let minted = await heroes.minted();
        expect(minted).deep.equal(MAX_SUPPLY);

        const fromID = 5001;
        const amount = 2;       //  already burned 6 Heroes
        const tokenIDs = [5001, 5002];
        tokenIDs.map(async id => {
            await expect(
                heroes.ownerOf(id)
            ).to.be.revertedWith('ERC721: invalid token ID');
        });

        await expect(
            heroes.connect(minter).breed(receiver.address, fromID, amount)
        ).to.be.revertedWith('Exceed MAX_SUPPLY');
        
        expect(await heroes.balanceOf(receiver.address)).deep.equal(balance);
        expect(await heroes.minted()).deep.equal(minted);
        tokenIDs.map(async id => {
            await expect(
                heroes.ownerOf(id)
            ).to.be.revertedWith('ERC721: invalid token ID');
        });
    });

    it('Should succeed when Manager calls cremation() to burn its Heroes', async() => {
        let balance = await heroes.balanceOf(manager.address);
        let minted = await heroes.minted();
        let burned = await heroes.burned();

        const tokenIDs = [BigNumber.from(20), BigNumber.from(30), BigNumber.from(70)];
        tokenIDs.map(async id => {
            expect(await heroes.ownerOf(id)).deep.equal(manager.address)
        });

        const tx = await heroes.connect(manager).cremation(tokenIDs)
        const receipt = await tx.wait();
        const event = receipt.events.find(e => { return e.event == 'ToTheAsh' });

        expect(event != undefined).true;
        expect(event.args.from).deep.equal(manager.address);
        expect(event.args.IDs).deep.equal(tokenIDs);

        expect(await heroes.balanceOf(manager.address)).deep.equal(balance.sub(tokenIDs.length));
        expect(await heroes.minted()).deep.equal(minted);       //  `minted` not decreased
        expect(await heroes.burned()).deep.equal(burned.add(tokenIDs.length));
        tokenIDs.map(async id => {
            await expect(
                heroes.ownerOf(id)
            ).to.be.revertedWith('ERC721: invalid token ID');
        });
    });

    it('Should succeed when Receiver calls cremation() to burn its Heroes', async() => {
        let balance = await heroes.balanceOf(receiver.address);
        let minted = await heroes.minted();
        let burned = await heroes.burned();

        const tokenIDs = [BigNumber.from(55), BigNumber.from(90), BigNumber.from(95)];
        tokenIDs.map(async id => {
            expect(await heroes.ownerOf(id)).deep.equal(receiver.address)
        });

        const tx = await heroes.connect(receiver).cremation(tokenIDs);
        const receipt = await tx.wait();
        const event = receipt.events.find(e => { return e.event == 'ToTheAsh' });

        expect(event != undefined).true;
        expect(event.args.from).deep.equal(receiver.address);
        expect(event.args.IDs).deep.equal(tokenIDs);

        expect(await heroes.balanceOf(receiver.address)).deep.equal(balance.sub(tokenIDs.length));
        expect(await heroes.minted()).deep.equal(minted);       //  `minted` not decreased
        expect(await heroes.burned()).deep.equal(burned.add(tokenIDs.length));
        tokenIDs.map(async id => {
            await expect(
                heroes.ownerOf(id)
            ).to.be.revertedWith('ERC721: invalid token ID');
        });
    });

    it('Should revert when Minter role calls breed() after burning Heroes - Manager - MAX_SUPPLY reached', async() => {
        let balance = await heroes.balanceOf(manager.address);
        let minted = await heroes.minted();
        expect(minted).deep.equal(MAX_SUPPLY);

        const fromID = 5001;
        const amount = 2;       //  already burned 6 Heroes
        const tokenIDs = [5001, 5002];
        tokenIDs.map(async id => {
            await expect(
                heroes.ownerOf(id)
            ).to.be.revertedWith('ERC721: invalid token ID');
        });

        await expect(
            heroes.connect(minter).breed(manager.address, fromID, amount)
        ).to.be.revertedWith('Exceed MAX_SUPPLY');
        
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance);
        expect(await heroes.minted()).deep.equal(minted);
        tokenIDs.map(async id => {
            await expect(
                heroes.ownerOf(id)
            ).to.be.revertedWith('ERC721: invalid token ID');
        });
    });

    it('Should revert when Minter role calls breed() after burning Heroes - Receiver - MAX_SUPPLY reached', async() => {
        let balance = await heroes.balanceOf(receiver.address);
        let minted = await heroes.minted();
        expect(minted).deep.equal(MAX_SUPPLY);

        const fromID = 5001;
        const amount = 2;       //  already burned 6 Heroes
        const tokenIDs = [5001, 5002];
        tokenIDs.map(async id => {
            await expect(
                heroes.ownerOf(id)
            ).to.be.revertedWith('ERC721: invalid token ID');
        });

        await expect(
            heroes.connect(minter).breed(receiver.address, fromID, amount)
        ).to.be.revertedWith('Exceed MAX_SUPPLY');
        
        expect(await heroes.balanceOf(receiver.address)).deep.equal(balance);
        expect(await heroes.minted()).deep.equal(minted);
        tokenIDs.map(async id => {
            await expect(
                heroes.ownerOf(id)
            ).to.be.revertedWith('ERC721: invalid token ID');
        });
    });

    it('Should revert when Non-Admin Role tries to call disable()', async() => {
        expect(await heroes.disabled()).deep.equal(false);
        await expect(
            heroes.connect(manager).disable()
        ).to.be.revertedWith('Caller is not Admin');
        expect(await heroes.disabled()).deep.equal(false);
    });

    it('Should succeed when Admin Role calls disable()', async() => {
        expect(await heroes.disabled()).deep.equal(false);
        await heroes.connect(admin).disable()
        expect(await heroes.disabled()).deep.equal(true);
    });

    it('Should succeed when Admin Role calls disable(), and still remain `disabled = true`', async() => {
        expect(await heroes.disabled()).deep.equal(true);
        await heroes.connect(admin).disable()
        expect(await heroes.disabled()).deep.equal(true);
    });

    it('Should revert when Non-Admin Role tries to call disable() when `disabled = true`', async() => {
        expect(await heroes.disabled()).deep.equal(true);
        await expect(
            heroes.connect(minter).disable()
        ).to.be.revertedWith('Caller is not Admin');
        expect(await heroes.disabled()).deep.equal(true);
    });

    it('Should revert when Minter role calls breed() - Manager - After `disabled = true`', async() => {
        let balance = await heroes.balanceOf(manager.address);
        let minted = await heroes.minted();
        expect(minted).deep.equal(MAX_SUPPLY);

        const fromID = 5001;
        const amount = 2;       //  already burned 6 Heroes
        const tokenIDs = [5001, 5002];
        tokenIDs.map(async id => {
            await expect(
                heroes.ownerOf(id)
            ).to.be.revertedWith('ERC721: invalid token ID');
        });

        await expect(
            heroes.connect(minter).breed(manager.address, fromID, amount)
        ).to.be.revertedWith('Disabled');
        
        expect(await heroes.balanceOf(manager.address)).deep.equal(balance);
        expect(await heroes.minted()).deep.equal(minted);
        tokenIDs.map(async id => {
            await expect(
                heroes.ownerOf(id)
            ).to.be.revertedWith('ERC721: invalid token ID');
        });
    });

    it('Should revert when Minter role calls breed() - Receiver - After `disabled = true`', async() => {
        let balance = await heroes.balanceOf(receiver.address);
        let minted = await heroes.minted();
        expect(minted).deep.equal(MAX_SUPPLY);

        const fromID = 5001;
        const amount = 2;       //  already burned 6 Heroes
        const tokenIDs = [5001, 5002];
        tokenIDs.map(async id => {
            await expect(
                heroes.ownerOf(id)
            ).to.be.revertedWith('ERC721: invalid token ID');
        });

        await expect(
            heroes.connect(minter).breed(receiver.address, fromID, amount)
        ).to.be.revertedWith('Disabled');
        
        expect(await heroes.balanceOf(receiver.address)).deep.equal(balance);
        expect(await heroes.minted()).deep.equal(minted);
        tokenIDs.map(async id => {
            await expect(
                heroes.ownerOf(id)
            ).to.be.revertedWith('ERC721: invalid token ID');
        });
    });

    it('Should be able to query tokenURI()', async() => {
        const tokenIDs = [150, 1515, 4500];
        tokenIDs.map(async id => {
            expect(await heroes.tokenURI(id)).deep.equal(baseURI + id)
        });
    });

    it('Should revert when querying tokenURI() of non-existed tokenID', async() => {
        const tokenIDs = [5001, 6000];
        tokenIDs.map(async id => {
            await expect(
                heroes.tokenURI(id)
            ).to.be.revertedWith('ERC721: invalid token ID')
        });
    });

    it('Should revert when querying tokenURI() of burned tokenID', async() => {
        const tokenIDs = [10, 61, 80, 51, 85, 100];
        tokenIDs.map(async id => {
            await expect(
                heroes.tokenURI(id)
            ).to.be.revertedWith('ERC721: invalid token ID')
        });
    });

    it('Should revert when Hero is on leasing, but owner tries to transfer', async() => {
        const tokenID = 150;
        const block = await ethers.provider.getBlockNumber();
        const timestamp = (await ethers.provider.getBlock(block)).timestamp;
        const due = timestamp + 7 * days;

        await rental.connect(manager).setForLease(heroes.address, tokenID, due)

        expect(await heroes.ownerOf(tokenID)).deep.equal(manager.address);
        const nonce1 = await heroes.nonces(tokenID, manager.address);
        const nonce2 = await heroes.nonces(tokenID, receiver.address);

        await expect(
            heroes.connect(manager).transferFrom(manager.address, receiver.address, tokenID)
        ).to.be.revertedWith('On leasing');

        expect(await heroes.ownerOf(tokenID)).deep.equal(manager.address);
        expect(await heroes.nonces(tokenID, manager.address)).deep.equal(nonce1);
        expect(await heroes.nonces(tokenID, receiver.address)).deep.equal(nonce2);
    })

    it('Should succeed to transfer Hero when item pass the due date of leasing', async() => {
        const tokenID = 150;
        const block = await ethers.provider.getBlockNumber();
        timestamp = (await ethers.provider.getBlock(block)).timestamp;
        const due = (await rental.onLeasing(tokenID)).toNumber();

        if (timestamp < due) {
            await network.provider.send("evm_setNextBlockTimestamp", [due])
            await network.provider.send("evm_mine")
        }

        expect(await heroes.ownerOf(tokenID)).deep.equal(manager.address);
        const nonce1 = await heroes.nonces(tokenID, manager.address);
        const nonce2 = await heroes.nonces(tokenID, receiver.address);

        await heroes.connect(manager).transferFrom(manager.address, receiver.address, tokenID)

        expect(await heroes.ownerOf(tokenID)).deep.equal(receiver.address);
        expect(await heroes.nonces(tokenID, manager.address)).deep.equal( nonce1.add(1) );
        expect(await heroes.nonces(tokenID, receiver.address)).deep.equal( nonce2.add(1) );
    })

    it('Should succeed to transfer Hero normally when Rental contract is disabled', async() => {
        const tokenID = 200;
        await heroes.connect(manager).setRental(ethers.constants.AddressZero);
        expect(await heroes.rental()).deep.equal(ethers.constants.AddressZero);
        expect(await heroes.ownerOf(tokenID)).deep.equal(manager.address);

        await heroes.connect(manager).transferFrom(manager.address, receiver.address, tokenID)

        expect(await heroes.ownerOf(tokenID)).deep.equal(receiver.address);
    })

    it('Should succeed to transfer Hero (on leasing) normally when Rental contract is disabled', async() => {
        const tokenID = 250;
        const block = await ethers.provider.getBlockNumber();
        const timestamp = (await ethers.provider.getBlock(block)).timestamp;
        const due = timestamp + 7 * days;

        await rental.connect(manager).setForLease(heroes.address, tokenID, due)

        expect(await heroes.rental()).deep.equal(ethers.constants.AddressZero);
        expect(await heroes.ownerOf(tokenID)).deep.equal(manager.address);

        await heroes.connect(manager).transferFrom(manager.address, receiver.address, tokenID)

        expect(await heroes.ownerOf(tokenID)).deep.equal(receiver.address);
    })

    it('Should revert when Hero is on leasing, but owner tries to transfer', async() => {
        const tokenID = 250;        // Item on leasing, but Rental contract is disabled -> succeed transferring to Receiver
        await heroes.connect(manager).setRental(rental.address);
        expect(await heroes.rental()).deep.equal(rental.address);

        expect(await heroes.ownerOf(tokenID)).deep.equal(receiver.address);

        await expect(
            heroes.connect(receiver).transferFrom(receiver.address, manager.address, tokenID)
        ).to.be.revertedWith('On leasing');

        expect(await heroes.ownerOf(tokenID)).deep.equal(receiver.address);
    })

    it('Should succeed to transfer Hero when item pass the due date of leasing', async() => {
        const tokenID = 250;
        const block = await ethers.provider.getBlockNumber();
        timestamp = (await ethers.provider.getBlock(block)).timestamp;
        const due = (await rental.onLeasing(tokenID)).toNumber();

        if (timestamp < due) {
            await network.provider.send("evm_setNextBlockTimestamp", [due])
            await network.provider.send("evm_mine")
        }

        expect(await heroes.ownerOf(tokenID)).deep.equal(receiver.address);

        await heroes.connect(receiver).transferFrom(receiver.address, manager.address, tokenID)

        expect(await heroes.ownerOf(tokenID)).deep.equal(manager.address);
    })

    it('Should revert when Hero is on leasing, but owner tries to transfer', async() => {
        const tokenID = 300;
        const block = await ethers.provider.getBlockNumber();
        const timestamp = (await ethers.provider.getBlock(block)).timestamp;
        const due = timestamp + 7 * days;

        await rental.connect(manager).setForLease(heroes.address, tokenID, due)

        expect(await heroes.ownerOf(tokenID)).deep.equal(manager.address);

        await expect(
            heroes.connect(manager).transferFrom(manager.address, receiver.address, tokenID)
        ).to.be.revertedWith('On leasing');

        expect(await heroes.ownerOf(tokenID)).deep.equal(manager.address);
    })

    it('Should succeed to transfer Hero when item pass the due date of leasing', async() => {
        const tokenID = 300;
        const block = await ethers.provider.getBlockNumber();
        timestamp = (await ethers.provider.getBlock(block)).timestamp;
        const due = (await rental.onLeasing(tokenID)).toNumber();

        if (timestamp < due) {
            await network.provider.send("evm_setNextBlockTimestamp", [due])
            await network.provider.send("evm_mine")
        }

        expect(await heroes.ownerOf(tokenID)).deep.equal(manager.address);

        await heroes.connect(manager).transferFrom(manager.address, receiver.address, tokenID)

        expect(await heroes.ownerOf(tokenID)).deep.equal(receiver.address);
    })
});