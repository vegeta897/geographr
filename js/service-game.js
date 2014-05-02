/* Game logic service */

angular.module('Geographr.game', []).service('gameUtility', function(actCanvasUtility,canvasUtility) {
    // TODO: Move all these data sets into a separate file
    var resourceList = {
        lumber: { color: '8e7a54', value: 4, weight: 20, abundance: 40, unit: {pre:'planks'} },
        fish: { color: '79888e', value: 6, weight: 2, abundance: 15 },
        fruit: { color: '8e2323', value: 18, weight: 1, abundance: 15, unit: {pre:'pieces'} },
        vegetables: { color: '7a984d', value: 12, weight: 2, abundance: 20 },
        meat: { color: '82341c', value: 48, weight: 6, abundance: 10, unit: {pre:'cuts'} },
        salt: { color: 'a8a797', value: 6, weight: 4, abundance: 20, unit: {pre:'pouches'} },
        coal: { color: '191a1a', value: 6, weight: 10, abundance: 30, unit: {post:'chunks'} },
        iron: { color: '59534a', value: 36, weight: 15, abundance: 15, unit: {post:'ingots'} },
        copper: { color: '944b2e', value: 28, weight: 12, abundance: 20, unit: {post:'ingots'} },
        silver: { color: 'b0b0b0', value: 200, weight: 25, abundance: 1, unit: {post:'ingots'} },
        gold: { color: 'cab349', value: 500, weight: 20, abundance: 0.02, unit: {post:'ingots'} },
        wool: { color: '9e9b81', value: 48, weight: 2, abundance: 20, unit: {pre:'sacks'} },
        tools: { color: '5f5f5f', value: 180, weight: 16, abundance: 8 },
        weapons: { color: '5f5656', value: 240, weight: 26, abundance: 5 },
        spices: { color: '925825', value: 60, weight: 1, abundance: 3, unit: {pre:'pouches'} }
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
    var scope, userInventory, fireRef, fireUser, fireInventory; // References to controller stuff
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
        for(var i = dist*-1; i <= dist; i++) {
            for(var ii = dist*-1; ii <= dist; ii++) {
                if(dist*dist > i*i + ii*ii) {
                    neighbors.push((loc[0]+i)+':'+(loc[1]+ii));
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
    var getNearWater = function(terrain,location,distance) {
        location = {x: parseInt(location[0]), y: parseInt(location[1]) };
        var inRange = getCircle([location.x,location.y],distance), nearWater = [];
        for(var i = 0; i < inRange.length; i++) {
            if(!terrain.hasOwnProperty(inRange[i])) { nearWater.push(inRange[i]); }
        }
        return nearWater;
    };
    var getNearest = function(ox,oy,near,exclude) {
        var nearest = {coords: '', dist: 999};
        for(var i = 0; i < near.length; i++) {
            var nx = near[i].split(':')[0], ny = near[i].split(':')[1];
            if(jQuery.inArray(nx+':'+ny,exclude) >= 0) { console.log('excluded!'); continue; }
            if(nx == ox && ny == oy) { console.log('self!'); continue; } // Not self
            if((nx - ox) * (nx - ox) + (ny - oy) * (ny - oy) < nearest.dist) {
                nearest.coords = near[i]; nearest.dist = (nx - ox) * (nx - ox) + (ny - oy) * (ny - oy);
            }
        }
        return nearest.coords;
    };
    var getCoastDistance = function(terrain,location) { // Returns squared distance of nearest water
        location = {x: parseInt(location.split(':')[0]), y: parseInt(location.split(':')[1]) };
        var searchDist = 0, nearWater;
        for(var i = 1; i < 50; i++) {
            nearWater = getNearWater(terrain,[location.x,location.y],i*4);
            if(nearWater.length > 0) { searchDist = i*4; break; }
        }
        var closest = 50000;
        for(var w = 0; w < nearWater.length; w++) {
            var distX = Math.abs(nearWater[w].split(':')[0] - location.x), 
                distY = Math.abs(nearWater[w].split(':')[1] - location.y);
            closest = Math.min(closest,distX*distX + distY*distY);
            if(closest <= 1) { break; }
        }
        return closest;
    };
    var genCampEconomy = function(grid,terrain) {
        Math.seedrandom(grid);
        var economy = {}; var resources = {};
        for(var resKey in resourceList) { // Resource demands
            if(!resourceList.hasOwnProperty(resKey)) { continue; }
            var res = resourceList[resKey];
            // TODO: Supply and demands influenced by location & terrain 
            // Create module functions with coefficient parameters to handle this
            var random = Math.random();
            resources[resKey] = { color: res.color };
            resources[resKey].supply =
                Math.round((random * 10 * res.abundance)/res.value);
            resources[resKey].demand =
                Math.round((1 - random)*100);
            resources[resKey].value = res.value * (resources[resKey].demand / 50);
            resources[resKey].value = resources[resKey].value == 0 ? 0.1 : resources[resKey].value;
//                console.log(resKey,'-',parseInt(random*100),'---------------------------------');
//                console.log('supply:',economy[resKey].supply);
//                console.log('demand:',economy[resKey].demand);
//                console.log('abundance:',res.abundance,'raw value:',res.value);
//                console.log('camp value:',economy[resKey].value);
        }
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
        getVisibility: function(terrain,visible,coords) {
            var x = parseInt(coords.split(':')[0]), y = parseInt(coords.split(':')[1]);
            var inRange = getCircle([x,y],4);
            for(var key in visible) { // Set all pixels to explored
                if(visible.hasOwnProperty(key)) { visible[key] = 2; }
            }
            for(var i = 0; i < inRange.length; i++) { // Set in-range pixels to visible
                visible[inRange[i]] = 1;
            }
            var remove = [];
            for(var j = remove.length-1; j > -1; j--) { // Delete grids in remove array from inRange array
                inRange.splice(remove[j],1);
            }
            return visible;
        },
        getActivityAbundance: function(terrain,location,camps) {
            Math.seedrandom(location); // Consistent grid results
            var abundance = {
                forage: Math.min(1,7/terrain[location]) * (Math.random()/2+0.5), 
                hunt: Math.min(1,10/terrain[location]) * (Math.random()*3/5+0.6), 
                mine: Math.min(1,terrain[location] / 20)  * (Math.random()/2+0.5)
            };
            // TODO: Abstract these camp and coast proximity factors
            abundance.forage = isCampNear(camps,location.split(':'),1) ? 
                abundance.forage * 0.8 : abundance.forage;
            abundance.hunt = isCampNear(camps,location.split(':'),1) ? 
                abundance.hunt * 0.6 : abundance.hunt;
            var coastDist = getCoastDistance(terrain,location);
            abundance.forage = abundance.forage * (1-0.8*(1-Math.min(coastDist,3)/3)); // Less near coast
            abundance.hunt = abundance.hunt * (1-0.8*(1-Math.min(coastDist,9)/9)); // Less near coast
            
            return abundance;
        },
        createUserCamp: function(terrain,camps) {
            Math.seedrandom();
            for(var i = 0; i < 5000; i++) {
                var x = randomIntRange(20,279), y = randomIntRange(20,279);
                if(terrain[x+':'+y] && !camps[x+':'+y] && terrain[x+':'+y] < 10) { return x+':'+y; }
            }
            return false;
        },
        genNativeCamps: function(terrain) {
            var camps = [];
            for(var tKey in terrain) {
                if(terrain.hasOwnProperty(tKey)) {
                    var x = parseInt(tKey.split(':')[0]), y = parseInt(tKey.split(':')[1]);
                    var area = parseInt(x/20) * 20 + ':' + parseInt(y/20) * 20;
                    Math.seedrandom(area);
                    var minRange = randomIntRange(8,14);
                    if(Math.random() < 0.10) { minRange = randomIntRange(3,8) }
                    if(isCampNear(camps,tKey.split(':'),minRange)) {
                        continue; // If camp nearby, veto this grid
                    }
                    var nearGrids = getNeighbors(tKey.split(':'),2);
                    var nearStats = { water: 0, avgElevation: 0 };
                    for(var i = 0; i < nearGrids.length; i++) {
                        nearStats.water += terrain[nearGrids[i]] ? 0 : 1;
                        nearStats.avgElevation += terrain[nearGrids[i]] ? terrain[nearGrids[i]] : 0;
                        if(i == nearGrids.length - 1) {
                            nearStats.avgElevation /= 13 - nearStats.water;
                        }
                    }
                    var campChance = nearStats.water > 7 ? 0.03 : (12-nearStats.water) / 100;
                    campChance -= nearStats.avgElevation / 80; // Lower chance the higher elevation
                    Math.seedrandom(tKey);
                    if(Math.random() < campChance) {
                        camps.push = tKey;
                    }
                }
            }
            return camps;
        },
        expandCamp: function(grid,terrain) {
            Math.seedrandom(grid); // Deterministic based on grid
            var x = parseInt(grid.split(':')[0]), y = parseInt(grid.split(':')[1]);
            return { economy: genCampEconomy(grid,terrain), type: 'camp', name: Chance(x*1000 + y).word(),
                grid: grid }
        },
        expandObjects: function(objects,grid,terrain) { // Generate traits and properties of objects
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
        attachInventory: function(inv) { userInventory = inv; },
        attachFireRef: function(ref) { fireRef = ref; },
        attachFireUser: function(user) { fireUser = user; },
        attachFireInventory: function(fireInv) { fireInventory = fireInv; },
        addToInventory: addToInventory, cleanInventory: cleanInventory, dressItem: dressItem,
        getItemActions: getItemActions,
        resourceList: resourceList, event: event, eventMessages: eventMessages, 
        eventProducts: eventProducts, edibles: edibles, equipment: equipment
    }
});