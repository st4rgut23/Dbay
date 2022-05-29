const truffleAssert = require("truffle-assertions");
const Dbay = artifacts.require("Dbay");
const ExposedDbay = artifacts.require("ExposedDbay");

contract("Account setup", async accounts => {
    let dBay;
    const guest = accounts[0]

    beforeEach(async () => {
        dBay = await Dbay.new();
    })

    it ("Get an account with a default profile", async () => {
        const dbayAccount = await dBay.getAccount.call({from: guest})
        assert.equal(dbayAccount.username, "", "username is not the default username before user creation");
        assert.equal(dbayAccount.shippingAddr, "", "shipping address is not the default address before user creation");
        assert.equal(dbayAccount.wallet, 0, "address is not the default address before user creation");        
    })

    it ("Create a profile for a default account", async () => {
        const expectedUsername = 'test'
        const expectedAddress = 'test address'
        await dBay.createProfile(expectedUsername, expectedAddress, {from: guest, gas: 400000})
        const dbayAccount = await dBay.getAccount.call({from: guest})
        assert.equal(dbayAccount.username, expectedUsername, "username not set")
        assert.equal(dbayAccount.shippingAddr, expectedAddress, "address not set")
    })

    it ("Throws an error when creating an account more than once", async () => {
        const expectedUsername = 'test'
        const expectedAddress = 'test address'
        await dBay.createProfile(expectedUsername, expectedAddress, {from: guest, gas: 400000})
        await truffleAssert.reverts(
            dBay.createProfile(expectedUsername, expectedAddress, {from: guest, gas: 400000})
        )
    })
})

contract("List actions", async accounts => {
    let dBay;

    const expectedUsername = 'test'
    const expectedAddress = 'test address'

    const expectedUsername2 = 'test2'
    const expectedAddress2 = 'test address 2'

    const price = 10;
    const name = "name";
    const quantity = 1;    
    const owner = accounts[0]
    const guest = accounts[1]
    const owner2 = accounts[2]

    beforeEach(async () => {
        dBay = await Dbay.new();
        await dBay.createProfile(expectedUsername, expectedAddress, {from: owner, gas: 400000})
        await dBay.createProfile(expectedUsername2, expectedAddress2, {from: owner2, gas: 400000})    
    })

    it("Throws an error when a guest tries to list an item", async () => {
        await truffleAssert.reverts(
            dBay.listItem(price, name, quantity, {from: guest, gas: 400000})
        )
    })

    it("Lists an item", async () => {
        let OwnItems = await dBay.getOwnItems()
        assert.equal(OwnItems.length, 0, "User does not have 0 items before listing")

        await dBay.listItem(price, name, quantity, {from: owner, gas: 400000})
        
        OwnItems = await dBay.getOwnItems({from:owner})
        assert.equal(OwnItems.length, 1, "User does not have 1 item after listing")
        
        const Item = OwnItems[0];

        assert.equal(Item.price, price, "Price doesn't match")
        assert.equal(Item.name, name, "Name doesn't match")
        assert.equal(Item.quantity, quantity, "Quantity doesnt match")
        assert.equal(Item.owner, owner, "Owner doesn't match")
        assert.equal(Item.state, Dbay.State.Listed, "Initial state is not listed")
    })

    it("Gets the listed item among multiple listings from different users", async () => {
        await dBay.listItem(price, name, quantity, {from: owner, gas: 400000})
        await dBay.listItem(price, name, quantity, {from: owner2, gas:400000})
                
        OwnItems = await dBay.getOwnItems({from: owner})
        assert.equal(OwnItems.length, 1, "User does not have 1 item after listing")
        
        const Item = OwnItems[0];
        
        assert.equal(Item.owner, owner, "The item does not belong to owner")
    })
})

contract("Transacts between users", async accounts => {
    let dBay

    const buyerUsername = 'buyer'
    const buyerAddress = 'buyer address'

    const sellerUsername = 'seller'
    const sellerAddress = 'seller address'

    const price = 10
    const name = "name"
    const quantity = 1

    const seller = accounts[0]
    const buyer = accounts[1]

    const firstListingId = 0 // first listed item will have id = 0

    beforeEach(async () => {
        dBay = await Dbay.new()
        await dBay.createProfile(buyerUsername, buyerAddress, {from: buyer, gas:400000})
        await dBay.createProfile(sellerUsername, sellerAddress, {from: seller, gas:400000})
        await dBay.listItem(price, name, quantity, {from: seller, gas: 400000})
    })

    it('Checks the store has one listing', async () => {
        const ListedItems = await dBay.getListedItems();
        assert.equal(ListedItems.length, 1, 'There are no listed items despite listing an item');
    })

    it('Checks conditions before a purchase', async () => {
        const SoldItemsCount = await dBay.getSoldLength({from: seller, gas: 400000})
        const BoughtItemsCount = await dBay.getPurchasesLength({from: buyer, gas:400000})
        assert.equal(SoldItemsCount, 0, 'Sold items eixst even though not sold anything yet');
        assert.equal(BoughtItemsCount, 0, 'Bought items exist even though didn\'t buy anything yet');
    })

    it('Completes a purchase', async () => {
        const payment = price * 2 // buyer must put up 2 times price of item

        await dBay.buyItem(firstListingId, {from: buyer, gas: 1000000, value: payment})

        const SoldItemsCount = await dBay.getSoldLength({from: seller, gas: 400000})
        const BoughtItemsCount =  await dBay.getPurchasesLength({from: buyer, gas:400000})
        const BoughtItem = await dBay.findGoodById(firstListingId);

        assert.equal(SoldItemsCount, 1, 'There is not 1 sold item after purchase has been made')
        assert.equal(BoughtItemsCount, 1, 'There is not 1 bought item after purchase has been made')
        assert.equal(BoughtItem.state, Dbay.State.Sold, 'The good has not been sold after purchase is completed')
    })

    it('Fails to complete a purchase due to incorrect payment amount', async () => {
        const payment = price * 3
        await truffleAssert.reverts(dBay.buyItem(firstListingId, {from: buyer, gas: 1000000, value: payment}))
    })
})

contract("Exposed internal actions", async accounts => {
    let exposedDbay;
    const expectedUsername = 'test'
    const expectedAddress = 'test address'

    const price = 10;
    const name = "name";
    const quantity = 1;    
    const owner = accounts[0]

    beforeEach(async () => {
        exposedDbay = await ExposedDbay.new();
    })

    it('Finds a good by id', async () => {
        const initialId = 0;
        await exposedDbay.createProfile(expectedUsername, expectedAddress, {from: owner, gas: 400000})
        await exposedDbay.listItem(price, name, quantity, {from: owner, gas: 400000})
        const Item = await exposedDbay._findGoodById(initialId)
        assert.equal(Item.price, price, "Price doesn't match")
        assert.equal(Item.name, name, "Name doesn't match")
        assert.equal(Item.quantity, quantity, "Quantity doesnt match")
        assert.equal(Item.owner, owner, "Owner doesn't match")        
    })

    // cannot get the reason since it is not passed to the child contract fn used for testing
    it('Throws an error if good cannot be found by id', async () => {
        const invalidId = 0
        await truffleAssert.reverts(
            exposedDbay._findGoodById(invalidId), 
        )
    })
})