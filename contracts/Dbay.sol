// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;
import {Transaction} from "./Transaction.sol";

contract Dbay {
    uint32 goodId = 0;

    enum State { Unlisted, Listed, Sold } // Complete State means funds have been unlocked and the transaction successful
    State public GoodState;

    struct Good {
        uint32 price;
        string name;
        uint quantity;
        uint32 id; // aka the listing id, which is unique even if the same good is listed more than once
        address owner;
        State state;
    }

    struct User {
        string username;
        uint buyerRep;
        uint sellerRep;
        address wallet;
        string shippingAddr;
    }

    event NewUser(string username, string shippingAddr, address wallet);
    event PurchaseCount(uint count);
    event SoldCount(uint count);

    Good[] private Store; // contains all goods
    mapping(address => User) private Users;
    mapping(address => Transaction[]) private Transactions; // <user address, list of purchases>
    mapping(address => Good[]) private Goods;// <user address, list of Owned by user>

    function getItemsByState(State _state) internal view returns(Good[] memory){
        uint listingCounter = 0;
        for (uint i=0;i<Store.length;i++)
        {
            Good memory good = Store[i];
            if (good.state == _state){
                listingCounter++;
            }
        }
        Good[] memory Listings = new Good[](listingCounter);
        for (uint i=0;i<Store.length;i++){
            Good memory good = Store[i];
            if (good.state == _state){
                Listings[i] = good;
            }            
        }
        return Listings;
    }

    function getListedItems() external view returns(Good[] memory){
        return getItemsByState(State.Listed);
    }

    function getSoldItems() external view returns(Good[] memory){
        return getItemsByState(State.Sold);
    }

    function getUser(address addr) public view returns(User memory){
        return Users[addr];
    }

    function createProfile(string memory username, string memory shippingAddr) external{
        require(bytes(Users[msg.sender].username).length == 0);
        require(bytes(Users[msg.sender].shippingAddr).length == 0);
        require(Users[msg.sender].wallet == address(0));
        
        User memory user = User(username, 0, 0, msg.sender, shippingAddr);
        Users[msg.sender] = user;
        emit NewUser(Users[msg.sender].username, Users[msg.sender].shippingAddr, Users[msg.sender].wallet);
    }

    function getAccount() external view returns (User memory user) {
        User memory existUser = Users[msg.sender];
        return existUser;
    }

    modifier isUser(){
        require(bytes(Users[msg.sender].username).length > 0 && Users[msg.sender].wallet != address(0) && bytes(Users[msg.sender].shippingAddr).length > 0);
        _;
    }

    function buyItem(uint32 _goodId) external payable isUser{
        Good storage good = findGoodByIdInternal(_goodId);
        good.state = State.Sold;
        Transaction transaction = new Transaction(_goodId, msg.value, good.price, good.owner, msg.sender);
        Transactions[good.owner].push(transaction);
        Transactions[msg.sender].push(transaction);
    }

    function getTransactions(address addr) internal view returns(Transaction[] memory){
        return Transactions[addr];
    }

    function getItemById(uint id) external view isUser returns (Good memory good) {
        
    }

    // Get items the user sold and bought
    function getAllItems() internal view isUser returns (Transaction[] memory r) {
        return Transactions[msg.sender];
    }
    
    // returns the list of transactions where the user is the buyer
    function getPurchases() internal view isUser returns (Transaction[] memory) {
        Transaction[] storage TransactionArr = Transactions[msg.sender];
        uint purchaseCount = 0;
        for (uint i=0;i<TransactionArr.length;i++){
            Transaction curPurchase = TransactionArr[i];
            if (msg.sender == curPurchase.buyer()){
                purchaseCount++;
            }
        }
        Transaction[] memory purchases = new Transaction[](purchaseCount);
        for (uint i=0;i<TransactionArr.length;i++){
            Transaction curPurchase = TransactionArr[i];
            if (msg.sender == curPurchase.buyer()){
                purchases[i] = curPurchase;
            }
        }
        return purchases;
    }

    function getPurchasesLength() external view isUser returns (uint) {
        Transaction[] memory PurchaseArr = getPurchases();
        return PurchaseArr.length;
    }

    // returns a list of transactions where the user is the selelr
    function getSold() internal view isUser returns (Transaction[] memory) {
        Transaction[] storage TransactionArr = Transactions[msg.sender];

        uint soldCount = 0;
        for (uint i=0;i<TransactionArr.length;i++){
            Transaction curPurchase = TransactionArr[i];
            if (msg.sender == curPurchase.seller()){
                soldCount++;
            }
        }
        Transaction[] memory sold = new Transaction[](soldCount);
        for (uint i=0;i<TransactionArr.length;i++){
            Transaction curPurchase = TransactionArr[i];
            if (msg.sender == curPurchase.seller()){
                sold[i] = curPurchase;
            }
        }
        return sold;
    }    

    function getSoldLength() external view isUser returns (uint) {
        Transaction[] memory SoldArr = getSold();
        return SoldArr.length;
    }

    function getSoldArr() external view isUser returns (Transaction[] memory) {
        Transaction[] memory SoldArr = getSold();
        return SoldArr;
    }    

    // called internally to modify the Good object
    function findGoodByIdInternal(uint32 _goodId) internal view returns (Good storage) {
        for (uint i=0;i<Store.length;i++){
            Good storage good = Store[i];
            if (good.id == _goodId)
            {
                return good;
            }
        }
        revert("Item not found");
    }

    function findGoodById(uint32 _goodId) public view returns (Good memory) {
        return findGoodByIdInternal(_goodId);
    }    

    // does not cost an Gas because is external view
    function getOwnItems() external view isUser returns (Good[] memory) {
        return Goods[msg.sender];
    }

    function listItem(uint32 price, string memory name, uint32 quantity) public isUser {
        require(price > 0);

        Good memory good = Good(price, name, quantity, goodId, msg.sender, State.Listed);
        Goods[msg.sender].push(good);
        Store.push(good);
        goodId += 1;
    }

    function accept() payable public {}
}