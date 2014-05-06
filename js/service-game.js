/* Game logic service */

angular.module('Geographr.game', []).service('gameUtility', function(actCanvasUtility,canvasUtility) {
    // TODO: Move all these data sets into a separate file
    var resourceList = {
        lumber: { color: '8e7a54', value: 4, weight: 20, abundance: 30, 
            unit: {pre:'planks'}, terrainFactors: ['nearForests:0:8'] },
        fish: { color: '79888e', value: 6, weight: 2, abundance: 15,
            terrainFactors: ['nearWater:4'] },
        fruit: { color: '8e2323', value: 18, weight: 1, abundance: 15, 
            unit: {pre:'pieces'}, terrainFactors: ['inPlains:1:3'] },
        vegetables: { color: '7a984d', value: 12, weight: 2, abundance: 20,
            terrainFactors: ['inPlains:1:3'] },
        meat: { color: '82341c', value: 48, weight: 6, abundance: 10, 
            unit: {pre:'cuts'}, terrainFactors: ['inPlains:1:2'] },
        salt: { color: 'a8a797', value: 6, weight: 4, abundance: 20, 
            unit: {pre:'pouches'}, terrainFactors: ['nearMountains:4','nearWater:0.2'] },
        coal: { color: '191a1a', value: 6, weight: 10, abundance: 25, 
            unit: {post:'chunks'}, terrainFactors: ['nearMountains:3.5'] },
        iron: { color: '59534a', value: 36, weight: 15, abundance: 20, 
            unit: {post:'ingots'}, terrainFactors: ['nearMountains:2'] },
        copper: { color: '944b2e', value: 28, weight: 12, abundance: 20, 
            unit: {post:'ingots'}, terrainFactors: ['nearMountains:2.5'] },
        silver: { color: 'b0b0b0', value: 200, weight: 25, abundance: 1, 
            unit: {post:'ingots'}, terrainFactors: ['nearMountains:1'] },
        gold: { color: 'cab349', value: 500, weight: 20, abundance: 0.02, 
            unit: {post:'ingots'}, terrainFactors: ['nearMountains:0.5'] },
        wool: { color: '9e9b81', value: 48, weight: 2, abundance: 20, 
            unit: {pre:'sacks'}, terrainFactors: ['inPlains:0.2:2'] },
        tools: { color: '5f5f5f', value: 150, weight: 16, abundance: 8, 
            metaFactors: ['withLumberAndIron:1'] },
        weapons: { color: '5f5656', value: 180, weight: 26, abundance: 5,
            metaFactors: ['withLumberAndIron:0.8'] },
        spices: { color: '925825', value: 60, weight: 1, abundance: 3, 
            unit: {pre:'pouches'}, terrainFactors: ['nearMountains:-4'] }
    };
    var eventMessages = { // Event messages/instructions to show user
        success: {
            forage: 'You found <strong>some plants</strong> while foraging.',
            hunt: 'You killed an <strong>innocent animal.</strong>',
            mine: 'You mined out <strong>a mineral.</strong>'
        },
        ended: {
            forage: 'There are <strong>no more plants</strong> to be found.',
            hunt: 'There are <strong>no more animals</strong> to be found.',
            mine: 'There is <strong>nothing left to mine</strong> here.'
        },
        failure: {
            forage: 'You search for plants but <strong>find nothing</strong>.',
            hunt: 'You <strong>scared off</strong> the animal!',
            mine: 'You\'re <strong>too tired</strong> to continue mining.'
        }
    };
    var eventProducts = {
        forage: {
            'red berries': { color: '9e3333', rarity: 0.3, avgQty: 3 },
            'blue berries': { color: '334c9e', rarity: 0.5, avgQty: 2 },
            'green berries': { color: '689e48', rarity: 0.2, avgQty: 3 },
            'brown mushrooms': { color: '6f6053', rarity: 0, avgQty: 3 },
            'white mushrooms': { color: 'b0a9a4', rarity: 0.3, avgQty: 2 },
            'herbs': { color: '728448', rarity: 0.6, avgQty: 2 },
            'onions': { color: 'aaa982', rarity: 0.7, avgQty: 1 }
        },
        hunt: {
            'deer': { color: '6f4c32', rarity: 0.4, weight: 200, classes: ['pelt'] },
            'boar': { color: '49413d', rarity: 0.7, weight: 150, classes: ['pelt'] },
            'rabbit': { color: '6d5f58', rarity: 0, weight: 3, classes: ['pelt'] },
            'fox': { color: '6d341e', rarity: 0.8, weight: 12, classes: ['pelt'] },
            'wolf': { color: '4b4c4f', rarity: 0.9, weight: 70, classes: ['pelt'] },
            'mole': { color: '433a32', rarity: 0.9, weight: 2, classes: ['pelt'] },
            'pheasant': { color: '713926', rarity: 0.7, weight: 1, classes: [] },
            'duck': { color: '433a32', rarity: 0.8, weight: 3, classes: [] }
        },
        mine: {
            'salt': { color: 'a8a797', rarity: 0, profession: 'saltFarm' },
            'coal': { color: '191a1a', rarity: 0.2, profession: 'blacksmith' },
            'iron': { color: '593125', rarity: 0.4, profession: 'blacksmith' },
            'copper': { color: '924c36', rarity: 0.3, profession: 'blacksmith' },
            'silver': { color: 'b0b0b0', rarity: 0.8, profession: 'blacksmith' },
            'gold': { color: 'cab349', rarity: 0.85, profession: 'blacksmith' },
            'emerald': { color: '4f8e4f', rarity: 0.8, profession: 'jeweler' },
            'ruby': { color: '8e4242', rarity: 0.85, profession: 'jeweler' },
            'topaz': { color: 'a69748', rarity: 0.8, profession: 'jeweler' },
            'sapphire': { color: '485ea6', rarity: 0.85, profession: 'jeweler' },
            'diamond': { color: 'c8c3c5', rarity: 0.95, profession: 'jeweler' }
        }
    };
    var edibles = {
        'red berries': { energy: 2 },
        'blue berries': { energy: 3 },
        'green berries': { energy: 2, effects: ['poison','nasty'], cookedEnergy: 3 },
        'brown mushrooms': { energy: 4, cookedEnergy: 5 },
        'white mushrooms': { energy: 4, cookedEnergy: 5 },
        'spices': { energy: 1, effects: ['nasty'] },
        'onions': { energy: 4, effects: ['nasty'], cookedEnergy: 5 },
        'fruit': { energy: 6 },
        'vegetables': { energy: 5, cookedEnergy: 6 },
        'fish': { energy: 20, effects: ['nasty','bacterial'], cookedEnergy: 25 },
        'meat': { energy: 60, effects: ['nasty','bacterial'], cookedEnergy: 65 }
    };
    var equipment = {
        'small dagger': { weight: 2, color: '757270', classes: ['blade'] }
    };
    // References to controller stuff
    var scope, terrain, userInventory, fireRef, fireUser, fireInventory;
    var event = {}; // Holds event details
    var randomIntRange = function(min,max) { return Math.floor(Math.random() * (max - min + 1)) + min; };
    var randomRange = function(min,max) { return Math.random() * (max-min) + min; };
    var toRadians = function(angle) { return angle * 0.0174533; };
    var toDegrees = function(angle) { return (angle * 57.2957795 + 360) % 360; };
    var getDigit = function(num, digit) { return Math.floor(num / (Math.pow(10, digit-1)) % 10) };
    // Return a random element from input array
    var pickInArray = function(array) { return array[Math.floor(Math.random()*array.length)]; };
    var pickInObject = function(object) { // Return a random property from input object (attach name)
        var array = [];
        for(var key in object) { if(object.hasOwnProperty(key)) { 
            var property = object[key]; property.name = key; array.push(object[key]); } }
        return pickInArray(array);
    };
    var pickProduct = function(type) { // Pick a product in an array based on rarity property value
        Math.seedrandom(); var random = Math.random();
        var picked = pickInObject(eventProducts[type]);
        while(picked.rarity > random) {
            picked = pickInObject(eventProducts[type]);
        }
        return picked;
    };
    var getBoxNeighbors = function(nodes,x,y,dist) { // Check a box area around x,y
        var neighbors = [];
        x = parseInt(x); y = parseInt(y);
        for(var i = dist*-1; i <= dist; i++) {
            for(var ii = dist*-1; ii <= dist; ii++) {
                var nx = (x+i), ny = (y+ii);
                if(nodes.hasOwnProperty(nx+':'+ny)) {neighbors.push(nx+':'+ny); }
            }
        }
        return neighbors;
    };
    var getNeighbors = function(loc,dist) { // Check a diamond area around x,y
        var neighbors = [];
        loc = [parseInt(loc[0]),parseInt(loc[1])];
        for(var i = dist*-1; i <= dist; i++) {                      // pattern
            for(var ii = dist*-1; ii <= dist; ii++) {               //    0
                var total = Math.abs(i)+Math.abs(ii);               //   123
                if(total <= dist) {                                 //    4
                    neighbors.push((loc[0]+i)+':'+(loc[1]+ii));
                }
            }
        }
        return neighbors;
    };
    var getCircle = function(loc,dist) { // Check circular area around x,y
        var neighbors = [];
        loc = [parseInt(loc[0]),parseInt(loc[1])];
        for(var i = Math.ceil(dist)*-1; i <= Math.ceil(dist); i++) {
            for(var ii = Math.ceil(dist)*-1; ii <= Math.ceil(dist); ii++) {
                if(dist*dist >= i*i + ii*ii) {
                    neighbors.push({ grid:(loc[0]+i)+':'+(loc[1]+ii), dist2: i*i + ii*ii });
                }
            }
        }
        return neighbors;
    };
    // Add item or array of items to inventory, stacking if possible, and send to firebase
    var addToInventory = function(invItems) {
        if(Object.prototype.toString.call(invItems) !== '[object Array]') { invItems = [invItems] }
        for(var i = 0; i < invItems.length; i++) {
            var invItem = invItems[i];
            var status = invItem.status ? ':' + invItem.status : '';
            if(scope.hasOwnProperty('inventory')) {
                for(var key in scope.inventory) { if(!scope.inventory.hasOwnProperty(key)) { continue; }
                    if(scope.inventory[key].name == invItem.name &&
                        scope.inventory[key].type == invItem.type &&
                        scope.inventory[key].status == invItem.status) {
                        scope.inventory[key].amount += invItem.amount; invItem.amount = 0;
                    }
                }
                if(invItem.amount > 0) { scope.inventory[invItem.type+':'+invItem.name+status] = invItem; }
            } else { scope.inventory = {}; scope.inventory[invItem.type+':'+invItem.name+status] = invItem; }
        }
        fireInventory.set(angular.copy(cleanInventory(scope.inventory)));
    };
    var cleanInventory = function(inventory) { // Clean un-needed properties before storing on firebase
        var inventoryCopy = angular.copy(inventory);
        for(var invKey in inventoryCopy) {
            if(inventoryCopy.hasOwnProperty(invKey)) { inventoryCopy[invKey] = inventoryCopy[invKey].amount; }
        }
        return inventoryCopy;
    };
    var dressItem = function(item) { // Dress item with properties not stored on firebase
        var parent;
        switch(item.type) {
            case 'resource': parent = resourceList[item.name]; break;
            case 'plant': parent = eventProducts.forage[item.name]; break;
            case 'animal': parent = eventProducts.hunt[item.name]; break;
            case 'mineral': parent = eventProducts.mine[item.name]; break;
            default: parent = item; break;
        }
        item.color = parent.color; item.value = parent.value; item.weight = parent.weight;
        item.unit = parent.unit; item.materials = parent.materials; item.profession = parent.profession;
        item.materials = item.status == 'pelt' ? undefined : item.materials;
        var eatKey = item.status ? item.name+':'+item.status : item.name;
        if(scope.user.hasOwnProperty('autoEat') &&
            jQuery.inArray(eatKey,scope.user.autoEat) >= 0) { item.autoEat = true; }
        var actions = getItemActions(item);
        item.hasActions = actions !== false;
        if(item.hasActions) { item.actions = actions; }
        return item;
    };
    var getItemActions = function(item) {
        var actions = {};
        switch(item.type) {
            case 'animal':
                if(item.status || !scope.user.equipment || 
                    scope.user.equipment['small dagger'].condition <= 0) { return false; }
                if(jQuery.inArray('pelt',eventProducts.hunt[item.name].classes) >= 0) {
                    actions.skin = function(item,amount) {
                        if(amount < 1 || amount > item.amount || !parseInt(amount)) { return; }
                        amount = parseInt(amount);
                        console.log('skinning',amount,item.name);
                        if(item.amount - amount > 0) {
                            fireInventory.child(item.type+':'+item.name).set(item.amount - amount);
                            scope.inventory[item.type+':'+item.name].amount = item.amount - amount;
                        } else { fireInventory.child(item.type+':'+item.name).remove();
                            delete scope.inventory[item.type+':'+item.name]; }
                        Math.seedrandom();
                        scope.user.equipment['small dagger'].condition -= 5;
                        fireUser.child('equipment/small dagger').set(
                            scope.user.equipment['small dagger'].condition);
                        if(Math.random()<0.5) { return; } // TODO: Skinning skill level
                        var invItem =
                        { type: item.type, name: item.name, status: 'pelt', amount: parseInt(amount) };
                        addToInventory(invItem);
                    }
                }
                actions.eviscerate = function(item,amount) {
                    console.log('eviscerate',item,amount);
                };
                return actions; break;
        }
        return false;
    };
    var isCampNear = function(camps,loc,dist) { // Check a diamond area around x,y for a camp
        loc = [parseInt(loc[0]),parseInt(loc[1])];
        for(var i = dist*-1; i <= dist; i++) { for(var ii = dist*-1; ii <= dist; ii++) {
            var total = Math.abs(i)+Math.abs(ii);
            if(total <= dist && total > 0) {
                if(jQuery.inArray((loc[0]+i)+':'+(loc[1]+ii),camps) >= 0) { return true; }
            }
        }}
        return false;
    };
    var getNearWater = function(grid,distance) {
        grid = {x: parseInt(grid.split(':')[0]), y: parseInt(grid.split(':')[1]) };
        var inRange = getCircle([grid.x,grid.y],distance), nearWater = [];
        for(var i = 0; i < inRange.length; i++) {
            if(!terrain.hasOwnProperty(inRange[i].grid)) { nearWater.push(inRange[i].grid); }
        }
        return nearWater;
    };
    var getNearAverageElevation = function(grid,distance) {
        grid = {x: parseInt(grid.split(':')[0]), y: parseInt(grid.split(':')[1]) };
        var inRange = getCircle([grid.x,grid.y],distance), count = 0, total = 0;
        for(var i = 0; i < inRange.length; i++) {
            if(terrain.hasOwnProperty(inRange[i].grid)) { count++; total += terrain[inRange[i].grid]; }
        }
        return count > 0 ? total/count : 0;
    };
    var getNearMiningAbundance = function(grid,distance) {
        var elevation = terrain[grid], slope = getSlope(grid), abundance = 0;
        Math.seedrandom('mine'+grid);
        if(distance == 0) {
            return elevation < 7 ? slope/5 * Math.random()/20 :
                Math.min(1,((slope + elevation/8) / 10)) * (Math.random()/10+0.9)
        } else {
            grid = {x: parseInt(grid.split(':')[0]), y: parseInt(grid.split(':')[1]) };
            var inRange = getCircle([grid.x,grid.y],distance);
            for(var i = 0; i < inRange.length; i++) { if(!terrain.hasOwnProperty(inRange[i].grid)) { continue; }
                elevation = terrain[inRange[i].grid]; slope = getSlope(inRange[i].grid);
                var thisAbundance = elevation < 7 ? slope/5 * Math.random()/20 :
                    Math.min(1,((slope + elevation/8) / 10)) * (Math.random()/10+0.9);
                thisAbundance *= 1 - inRange[i].dist2 / 15; // Weakens over distance
                abundance += thisAbundance;
            }
        }
        return abundance;
    };
    var getSlope = function(grid) {
        grid = {x: parseInt(grid.split(':')[0]), y: parseInt(grid.split(':')[1]) };
        var slope = 0;
        slope += Math.abs(terrain[(grid.x-1)+':'+grid.y]-terrain[grid.x+':'+grid.y]) || 0;
        slope += Math.abs(terrain[(grid.x+1)+':'+grid.y]-terrain[grid.x+':'+grid.y]) || 0;
        slope += Math.abs(terrain[grid.x+':'+(grid.y+1)]-terrain[grid.x+':'+grid.y]) || 0;
        slope += Math.abs(terrain[grid.x+':'+(grid.y-1)]-terrain[grid.x+':'+grid.y]) || 0;
        return slope;
    };
    var getNearest = function(ox,oy,near,exclude) {
        var nearest = {coords: '', dist: 999};
        for(var i = 0; i < near.length; i++) {
            var nx = near[i].split(':')[0], ny = near[i].split(':')[1];
            if(jQuery.inArray(nx+':'+ny,exclude) >= 0) { continue; }
            if(nx == ox && ny == oy) { continue; } // Not self
            if((nx - ox) * (nx - ox) + (ny - oy) * (ny - oy) < nearest.dist) {
                nearest.coords = near[i]; nearest.dist = (nx - ox) * (nx - ox) + (ny - oy) * (ny - oy);
            }
        }
        return nearest.coords;
    };
    var getCoastDistance = function(grid) { // Returns squared distance of nearest water
        grid = { ref: grid, x: parseInt(grid.split(':')[0]), y: parseInt(grid.split(':')[1]) };
        var searchDist = 0, nearWater;
        for(var i = 1; i < 50; i++) {
            nearWater = getNearWater(grid.ref,i*4);
            if(nearWater.length > 0) { searchDist = i*4; break; }
        }
        var closest = 50000;
        for(var w = 0; w < nearWater.length; w++) {
            var distX = Math.abs(nearWater[w].split(':')[0] - grid.x), 
                distY = Math.abs(nearWater[w].split(':')[1] - grid.y);
            closest = Math.min(closest,distX*distX + distY*distY);
            if(closest <= 1) { break; }
        }
        return closest;
    };
    var calculateFactor = function(grid,factor,resources) {
        var result = 1;
        var type = factor.split(':')[0], amount = factor.split(':')[1];
        switch(type) {
            case 'nearWater': result = 1/(getCoastDistance(grid)/8); break;
            case 'nearMountains': result = getNearMiningAbundance(grid,3.5)/2.5; break;
            case 'withLumberAndIron': 
                result = 2 * Math.min(30,resources.lumber.supply)/30 * Math.min(20,resources.iron.supply)/10;
                break;
            default: return 1; break;
        }
        return Math.max(0,amount * result);
    };
    var genCampEconomy = function(grid) {
        var economy = {}; var resources = {};
        for(var resKey in resourceList) { if(!resourceList.hasOwnProperty(resKey)) { continue; }
            // TODO: Supply and demands influenced by location & terrain 
            Math.seedrandom(grid+resKey); var random = Math.random();
            resources[resKey] = { color: resourceList[resKey].color };
//            console.log(resKey,'-',parseInt(random*100),'---------------------------------');
            resources[resKey].demand = (1 - random)*20+40;
//            console.log('original demand:',resources[resKey].demand);
            if(resourceList[resKey].hasOwnProperty('terrainFactors')) {
                for(var i = 0; i < resourceList[resKey].terrainFactors.length; i++) {
//                    console.log(resKey,'---------------');
//                    console.log('demand:',resources[resKey].demand);
                    var factor = calculateFactor(grid,resourceList[resKey].terrainFactors[i],null);
//                    console.log('terrain factor:',resourceList[resKey].terrainFactors[i],factor);
                    resources[resKey].demand = factor > 1 ? resources[resKey].demand/Math.max(0.01,factor) :
                        factor == 0 ? resources[resKey].demand : resources[resKey].demand * (2 - factor);
//                    console.log('new demand:',resources[resKey].demand);
//                    console.log('---------------');
                }
            }
            resources[resKey].demand = Math.max(0,Math.min(100,
                Math.max(0,Math.min(100,Math.round(resources[resKey].demand))+Math.random()*8-4)));
            resources[resKey].value = Math.max(0.1,
                resourceList[resKey].value * ((resources[resKey].demand+10) / 60));
            resources[resKey].supply = Math.round(
                ((random*4+1) * resourceList[resKey].abundance)/(resources[resKey].value/2));
        }
        for(var resKey2 in resources) { if(!resources.hasOwnProperty(resKey2)) { continue; }
            var res = resourceList[resKey2];
//            console.log(resKey2,'---------------------------------------------------');
            if(resourceList[resKey2].hasOwnProperty('metaFactors')) {
                for(var j = 0; j < resourceList[resKey2].metaFactors.length; j++) {
                    var metaFactor = calculateFactor(grid,resourceList[resKey2].metaFactors[j],resources);
//                    console.log(resourceList[resKey2].metaFactors[j],'meta factor:',metaFactor,
//                        'demand:',resources[resKey2].demand);
                    resources[resKey2].demand = metaFactor > 1 ? 
                        resources[resKey2].demand/Math.max(0.01,metaFactor) :
                        metaFactor == 0 ? resources[resKey2].demand : 
                        resources[resKey2].demand * (2 - metaFactor);
                }
            }
            resources[resKey2].demand = Math.max(0,Math.min(100,
                Math.round(Math.max(0,Math.min(100,resources[resKey2].demand))+Math.random()*8-4)));
            resources[resKey2].value = Math.max(0.1,
                res.value * ((resources[resKey2].demand+10) / 60));
            resources[resKey2].supply = Math.round(
                ((random*4+1) * res.abundance)/(resources[resKey2].value/2));
            resources[resKey2].value = Math.max(1,resources[resKey2].value);
//            console.log('weighted demand:',resources[resKey2].demand);
//            console.log('supply:',resources[resKey2].supply);
//            console.log('abundance:',res.abundance,'raw value:',res.value);
//            console.log('camp value:',resources[resKey2].value);
            
        }
        economy.ecoZone = getCircle([grid.split(':')[0],grid.split(':')[1]],3.5);
        economy.resources = resources;
        var blacksmithFactor = resources['coal'].demand + resources['iron'].demand 
            + resources['copper'].demand + resources['tools'].demand + resources['weapons'].demand;
        if(blacksmithFactor/500 < Math.random() * 0.7 + 0.3) {
            economy.blacksmith = {};
            for(var minKey in eventProducts.mine) {
                if(!eventProducts.mine.hasOwnProperty(minKey)) { continue; }
                var mineral = eventProducts.mine[minKey];
                if(mineral.profession != 'blacksmith') { continue; }
                economy.blacksmith[minKey] = {};
                economy.blacksmith[minKey].value = resources[minKey] ? resources[minKey].value / 2 
                    : mineral.rarity * 40;
            }
        }
        return economy;
    };
    // Generate pool of resources for event
    var createEventPool = function(event) {
        var pool = [], number, i, product, item;
        var typesChosen = []; // Prevent 2 instances of same product, if necessary
        var coordsChosen = [];
        switch(event.type) {
            case 'forage':
                number = Math.max(Math.round(event.abundance * 3 + Math.random()*2*event.abundance),1);
                for(i = 0; i < number; i++) {
                    product = pickProduct(event.type);
                    while(jQuery.inArray(product.name,typesChosen) >= 0) { // Prevent duplicates
                        product = pickProduct(event.type);
                    }
                    typesChosen.push(product.name);
                    product.type = 'plant';
                    item = { product: product,
                        targetX: randomIntRange(100,199), targetY: randomIntRange(100,199) };
                    item.product.amount = Math.max(1,item.product.avgQty * event.abundance
                        + randomIntRange(0,Math.round(2*event.abundance)));
                    pool.push(item);
                }
                break;
            case 'hunt':
                number = Math.max(Math.round(event.abundance * 2 + Math.random()*event.abundance),1);
                for(i = 0; i < number; i++) {
                    product = pickProduct(event.type);
                    product.type = 'animal';
                    item = { product: product,
                        targetX: randomIntRange(100,199), targetY: randomIntRange(100,199) };
                    pool.push(item);
                }
                break;
            case 'mine':
                number = Math.round(1 + event.abundance * 8 + Math.random()*8*event.abundance);
                for(i = 0; i < number; i++) {
                    product = pickProduct(event.type);
                    product.type = 'mineral';
                    item = { product: product,
                        targetX: [randomIntRange(0,4),randomIntRange(0,2),randomIntRange(0,1)], 
                        targetY: [randomIntRange(0,4),randomIntRange(0,2),randomIntRange(0,1)] };
                    while(jQuery.inArray([item.targetX.join(':'),
                        item.targetY.join(':')].join(':'),coordsChosen) >= 0) {
                        item.targetX = 
                            [randomIntRange(0,4),randomIntRange(0,2),randomIntRange(0,1)];
                        item.targetY =
                            [randomIntRange(0,4),randomIntRange(0,2),randomIntRange(0,1)];
                    }
                    coordsChosen.push([item.targetX.join(':'),item.targetY.join(':')].join(':'));
                    pool.push(item);
                }
                break;
        }
        return pool;
    };
    var createEventTimers = function(eventType,stepsPerItem,stepLength,pauseLength) {
        event.step = 'start'; clearTimeout(event.timer);
        event.timer = setTimeout(function() {
            var nextStep = function() {
                event.step = event.step >= event.pool.length * (stepsPerItem+1) ? 
                    'end' : event.step + 1;
                actCanvasUtility.drawActivity(eventType,event);
                var nextStepLength = event.step % (stepsPerItem + 1) == 0 ? 
                    pauseLength + parseInt(Math.random() * pauseLength) : stepLength;
                if(event.step == 'end') { 
                    clearTimeout(event.timer);
                    actCanvasUtility.fillCanvas(actCanvasUtility.eventHighContext,'rgba(36,39,43,0.7)');
                    actCanvasUtility.drawText([150,150],26,'Click to continue...');
                } else { event.timer = setTimeout(nextStep,nextStepLength) }
            };
            event.step = 1; actCanvasUtility.drawActivity(eventType,event);
            event.timer = setTimeout(nextStep,stepLength);
        },pauseLength + parseInt(Math.random() * pauseLength));
    };
    
    return {
        setupActivity: function(eventInfo,skill) {
            event = {}; event.skill = skill ? Math.floor(skill / 10) : 0;
            Math.seedrandom();
            event.pool = createEventPool(eventInfo); event.result = {};
            event.seed = randomIntRange(0,10000); // For consistent redrawing
            switch(eventInfo.type) {
                case 'hunt': createEventTimers(eventInfo.type,4,400,800); break;
                case 'mine': event.clicks = []; event.energy = 10; break;
            }
            actCanvasUtility.drawActivity(eventInfo.type,event);
            return event.energy;
        },
        playActivity: function(type,click,skill) {
            event.skill = skill ? Math.floor(skill / 10) : 0;
            event.result.success = false; event.result.continue = false; event.result.products = [];
            var poolCopy = angular.copy(event.pool), threshold, i, dist, product, j;
            switch(type) {
                case 'forage':
                    threshold = 225 + event.skill*event.skill;
                    for(i = 0; i < poolCopy.length; i++) {
                        dist = (click.x - poolCopy[i].targetX)*(click.x - poolCopy[i].targetX) +
                            (click.y - poolCopy[i].targetY)*(click.y - poolCopy[i].targetY);
                        if(dist < threshold) {
                            event.result.success = true;
                            product = poolCopy[i].product; delete product.avgQty;
                            product.amount = Math.ceil(product.amount*((threshold-dist)/threshold));
                            event.pool.splice(i,1); // Remove product from pool
                            actCanvasUtility.drawCircle('main',[poolCopy[i].targetX,poolCopy[i].targetY],
                                1+(dist/120),'#ffffff'); // Show target
                            actCanvasUtility.drawLine('main',[click.x,click.y], // Show delta
                                [poolCopy[i].targetX,poolCopy[i].targetY],'#00ff00');
                            setTimeout(function() { // Redraw after 1 second
                                actCanvasUtility.drawActivity(type,event); },1000);
                            event.result.products.push(product);
                            break; // Only one product foraged per click
                        }
                    }
                    if(!event.result.success) { // If event failed, show harvest spots
                        event.result.ended = true;
                        for(j = 0; j < poolCopy.length; j++) {
                            actCanvasUtility.drawCircle('main',[poolCopy[j].targetX,poolCopy[j].targetY],
                                5,'#ffffff'); // Show target
                        }
                    }
                    if(event.pool.length == 0) { event.result.ended = true; }
                    break;
                case 'hunt':
                    if(event.step % 5 == 4) { // Clicked on-time
                        var animal = poolCopy[Math.floor(event.step/5)];
                        dist = Math.pow(click.x - animal.targetX,2) + Math.pow(click.y - animal.targetY,2);
                        if(dist <= Math.pow(event.skill/2 + 3 + animal.product.weight / 70,2)) {
                            event.result.success = true;
                            actCanvasUtility.drawCircle('main',[animal.targetX,animal.targetY],
                                12,'#ff0000');
                            product = animal.product; product.amount = 1; delete product.rarity;
                            event.result.products.push(product);
                        }
                    } else if(event.step != 'end' && event.step != 'start') {
                        var origStep = event.step; event.step = 'start';
                        actCanvasUtility.drawActivity('hunt',event); event.step = origStep;
                        if(event.step > (poolCopy.length-1) * 5) { event.step = poolCopy.length*5; }
                        else { event.step += 5 - event.step % 5 - 1; }
                    }
                    if(event.step == 'end') { event.result.ended = true; clearTimeout(event.timer); }
                    break;
                case 'mine':
                    event.clicks.push([click.x,click.y]); event.energy -= 1;
                    var result = actCanvasUtility.drawActivity(type,event);
                    if(result.onTarget) {
                        if(result.mined) {
                            event.energy += 1;
                            event.pool.splice(result.mined.poolIndex,1); // Remove product from pool
                            actCanvasUtility.drawActivity(type,event); // Redraw after removing mineral
                            product = angular.copy(result.mined.product); 
                            product.amount = 1; delete product.rarity;
                            event.result.products.push(product);
                            event.result.success = true; // Success, found a mineral!
                        }
                    } else { event.energy -= 0.5; } // Not on target, energy penalty
                    if(event.energy > 0) { event.result.continue = true; }
                    if(event.pool.length == 0) { event.result.ended = true; }
                    else if(event.energy <= 0) { event.result.success = false; event.result.ended = true; }
                    event.result.energy = event.energy;
                    break;
            }
            event.result.message = event.result.success || event.step == 'end' ? 
                event.result.ended ? eventMessages.ended[type] : eventMessages.success[type] 
                    : event.result.continue ? '' : eventMessages.failure[type];
            return event.result;
        },
        getVisibility: function(visible,coords) {
            var x = parseInt(coords.split(':')[0]), y = parseInt(coords.split(':')[1]);
            var inRange = getCircle([x,y],3.5);
            for(var key in visible) { // Set all pixels to explored
                if(visible.hasOwnProperty(key)) { visible[key] = 2; }
            }
            for(var i = 0; i < inRange.length; i++) { // Set in-range pixels to visible
                visible[inRange[i].grid] = 1;
            }
            var remove = [];
            for(var j = remove.length-1; j > -1; j--) { // Delete grids in remove array from inRange array
                inRange.splice(remove[j],1);
            }
            return visible;
        },
        getActivityAbundance: function(location,camps) {
            Math.seedrandom(location); // Consistent grid results
            var x = parseInt(location.split(':')[0]), y = parseInt(location.split(':')[1]);
            var elevation = terrain[location], slope = getSlope(location);
            var abundance = {
                forage: Math.min(1,7/elevation) * (Math.random()/2+0.5) * Math.max(0.05,(1-slope/16)), 
                hunt: Math.min(1,10/elevation) * (Math.random()*3/5+0.6) * Math.max(0.05,(1-slope/10)),
                mine: getNearMiningAbundance(location,0)
            };
            // TODO: Abstract these camp and coast proximity factors
            abundance.forage = isCampNear(camps,[x,y],1) ? abundance.forage * 0.8 : abundance.forage;
            abundance.hunt = isCampNear(camps,[x,y],1) ? abundance.hunt * 0.6 : abundance.hunt;
            var coastDist = getCoastDistance(location);
            abundance.forage = abundance.forage * (1-0.8*(1-Math.min(coastDist,3)/3)); // Less near coast
            abundance.hunt = abundance.hunt * (1-0.8*(1-Math.min(coastDist,9)/9)); // Less near coast
            
            return abundance;
        },
        createUserCamp: function(camps) {
            Math.seedrandom();
            for(var i = 0; i < 5000; i++) {
                var x = randomIntRange(20,279), y = randomIntRange(20,279);
                if(terrain[x+':'+y] && !camps[x+':'+y] && terrain[x+':'+y] < 10) { return x+':'+y; }
            }
            return false;
        },
        genNativeCamps: function() {
            var camps = []; var count = 0;
            for(var tKey in terrain) { if(!terrain.hasOwnProperty(tKey)) { continue; }
                count++; //if(count > 1000) { break; }
                var x = parseInt(tKey.split(':')[0]), y = parseInt(tKey.split(':')[1]);
                var area = parseInt(x/20) * 20 + ':' + parseInt(y/20) * 20;
                Math.seedrandom(area);
                var minRange = randomIntRange(10,16);
                if(Math.random() < 0.06) { minRange = randomIntRange(4,10) }
                if(isCampNear(camps,tKey.split(':'),minRange)) { continue; } // If camp nearby, veto this grid
                var nearGrids = getCircle(tKey.split(':'),2.5);
                var nearStats = { water: 0, avgElevation: 0 };
                for(var i = 0; i < nearGrids.length; i++) {
                    nearStats.water += terrain[nearGrids[i].grid] ? 0 : 1;
                    nearStats.avgElevation += terrain[nearGrids[i].grid] ? terrain[nearGrids[i].grid] : 0;
                    if(i == nearGrids.length - 1) {
                        nearStats.avgElevation /= 21 - nearStats.water;
                    }
                }
                var campChance = nearStats.water > 7 ? nearStats.water * 0.02 : (16-nearStats.water) / 100;
                campChance -= nearStats.avgElevation / 160; // Lower chance the higher elevation
                Math.seedrandom(tKey);
                if(Math.random() < campChance) {
                    camps.push(tKey); console.log('terrain',count,'-',tKey,'added - total:',camps.length);
                }
            }
            return camps;
        },
        expandCamp: function(grid) {
            Math.seedrandom(grid); // Deterministic based on grid
            var x = parseInt(grid.split(':')[0]), y = parseInt(grid.split(':')[1]);
            return { economy: genCampEconomy(grid), type: 'camp', name: Chance(x*1000 + y).word(),
                grid: grid }
        },
        expandObjects: function(objects,grid) { // Generate traits and properties of objects
            if(!objects || objects.length < 1) { return undefined; }
            var expanded = [];
            for(var i = 0; i < objects.length; i++) {
                Math.seedrandom(grid); // Deterministic based on grid
                var newObject = objects[i];
                switch(objects[i].type) {
                    case 'animal': newObject.name = 'fox'; break;
                }
                expanded.push(newObject);
            }
            return expanded;
        },
        autoEat: function(user,neededHunger) {
            var newQuantities = {};
            for(var a = 0; a < user.autoEat.length; a++) {
                for(var invKey in user.inventory) {
                    if(user.inventory.hasOwnProperty(invKey) && neededHunger > 0) {
                        var invItem = { type: invKey.split(':')[0], name: invKey.split(':')[1],
                            status: invKey.split(':')[2], amount: user.inventory[invKey] };
                        var cooked = invItem.status == 'cooked' ? ':cooked' : '';
                        if(edibles.hasOwnProperty(invItem.name) && 
                            invItem.name+cooked == user.autoEat[a] && neededHunger > 0 && 
                            (!edibles[invItem.name].effects || invItem.status == 'cooked')) {
                            var foodItem = edibles[invItem.name];
                            var energy = cooked ? foodItem.cookedEnergy : foodItem.energy;
                            var eatAmount = Math.floor(neededHunger/energy);
                            eatAmount = Math.min(eatAmount,invItem.amount);
                            neededHunger -= energy * eatAmount;
                            if(eatAmount > 0) { newQuantities[invKey] = invItem.amount - eatAmount; }
                        }
                    }
                }
            }
            return { newInv: newQuantities, newNeeded: neededHunger };
        },
        tutorial: function(step) {
            var text = '';
            switch(parseInt(step)) {
                case 0:
                    text = 'Middle mouse to pan around, scroll wheel to zoom.\n' +
                        'Begin your journey by creating your camp!';
                    break;
            }
            return text;
        },
        capitalize: function(string) {
            return string.charAt(0).toUpperCase() + string.slice(1);
        },
        terrain180: function(terrain) {
            var output = {};
            for(var key in terrain) { if(terrain.hasOwnProperty(key)) {
                var x = key.split(':')[0], y = key.split(':')[1];
                output[((x-299)*-1) + ':' + ((y-299)*-1)] = terrain[key];
            }}
            return output;
        },
        attachScope: function(theScope) { scope = theScope; },
        attachTerrain: function(localTerrain) { terrain = localTerrain; },
        attachInventory: function(inv) { userInventory = inv; },
        attachFireRef: function(ref) { fireRef = ref; },
        attachFireUser: function(user) { fireUser = user; },
        attachFireInventory: function(fireInv) { fireInventory = fireInv; },
        addToInventory: addToInventory, cleanInventory: cleanInventory, dressItem: dressItem,
        getItemActions: getItemActions, getSlope: getSlope,
        resourceList: resourceList, event: event, eventMessages: eventMessages, 
        eventProducts: eventProducts, edibles: edibles, equipment: equipment
    }
});