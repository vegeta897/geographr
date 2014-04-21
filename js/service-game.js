/* Game logic service */

angular.module('Geographr.game', [])
.service('gameUtility', function(actCanvasUtility,canvasUtility) {
        // TODO: Move all these data sets into a separate file
        var resources = {
            lumber: { color: '8e7a54', value: 4, weight: 20, abundance: 40, unit: 'pieces' },
            fish: { color: '79888e', value: 6, weight: 2, abundance: 15 },
            fruit: { color: '8e2323', value: 18, weight: 1, abundance: 15, unit: 'pieces' },
            vegetables: { color: '7a984d', value: 12, weight: 2, abundance: 20 },
            meat: { color: '82341c', value: 48, weight: 6, abundance: 10, unit: 'cuts' },
            salt: { color: 'a8a797', value: 6, weight: 4, abundance: 20, unit: 'pouches' },
            coal: { color: '191a1a', value: 6, weight: 10, abundance: 30, unit: 'chunks' },
            iron: { color: '59534a', value: 36, weight: 15, abundance: 15, unit: 'ingots' },
            wool: { color: '9e9b81', value: 48, weight: 2, abundance: 20, unit: 'sacks' },
            tools: { color: '5f5f5f', value: 180, weight: 16, abundance: 8 },
            weapons: { color: '5f5656', value: 240, weight: 26, abundance: 5 },
            spices: { color: '925825', value: 60, weight: 1, abundance: 3, unit: 'pouches' }
        };
        var eventMessages = { // Event messages/instructions to show user
            success: {
                forage: 'You found <strong>some plants</strong> while foraging.',
                hunt: 'You killed an <strong>innocent animal.</strong>'
            },
            ended: {
                forage: 'There are <strong>no more plants</strong> to be found.',
                hunt: 'There are <strong>no more animals</strong> to be found.'
            },
            failure: {
                forage: 'You search for plants but <strong>find nothing</strong>.',
                hunt: 'You <strong>scared off</strong> the animal!'
            }
        };
        var eventProducts = {
            forage: [
                { name: 'red berries', color: '9e3333', rarity: 0.3, avgQty: 3 },
                { name: 'blue berries', color: '334c9e', rarity: 0.5, avgQty: 2 },
                { name: 'green berries', color: '689e48', rarity: 0.2, avgQty: 3 },
                { name: 'brown mushrooms', color: '6f6053', rarity: 0, avgQty: 3 },
                { name: 'white mushrooms', color: 'b0a9a4', rarity: 0.3, avgQty: 2 },
                { name: 'herbs', color: '728448', rarity: 0.6, avgQty: 2 },
                { name: 'onions', color: 'aaa982', rarity: 0.7, avgQty: 1 }
            ],
            hunt: [
                { name: 'deer', color: '6f4c32', rarity: 0.4, materials: ['meat','bone','pelt']},
                { name: 'boar', color: '49413d', rarity: 0.7, materials: ['meat','bone','pelt'] },
                { name: 'rabbit', color: '6d5f58', rarity: 0, materials: ['meat','bone','pelt'] },
                { name: 'fox', color: '6d341e', rarity: 0.8, materials: ['meat','bone','pelt'] },
                { name: 'wolf', color: '4b4c4f', rarity: 0.9, materials: ['meat','bone','pelt'] },
                { name: 'mole', color: '433a32', rarity: 0.9, materials: ['meat','bone','pelt'] },
                { name: 'pheasant', color: '713926', rarity: 0.7, materials: ['meat','bone'] },
                { name: 'duck', color: '433a32', rarity: 0.8, materials: ['meat','bone'] }
            ]
        };
        var edibles = {
            'red berries': { calories: 2 },
            'blue berries': { calories: 3 },
            'green berries': { calories: 2, effects: ['poison','nasty'] },
            'brown mushrooms': { calories: 4 },
            'white mushrooms': { calories: 4 },
            'spices': { calories: 1, effects: ['nasty'] },
            'onions': { calories: 4, effects: ['nasty'] },
            'fruit': { calories: 6 },
            'vegetables': { calories: 5 },
            'fish': { calories: 20, effects: ['nasty','foodPoisoning'] },
            'meat': { calories: 60, effects: ['nasty','foodPoisoning'] }
        };
        var event = {}; // Holds event details
        var randomIntRange = function(min,max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        };
        var randomRange = function(min,max) {
            return Math.random() * (max-min) + min;
        };
        var toRadians = function(angle) {
            return angle * 0.0174533;
        };
        var toDegrees = function(angle) {
            return (angle * 57.2957795 + 360) % 360;
        };
        var getDigit = function(num, digit) {
            return Math.floor(num / (Math.pow(10, digit-1)) % 10)
        };
        var pickInArray = function(array) { // Return a random element from input array
            return array[Math.floor(Math.random()*array.length)];
        };
        var pickProduct = function(type) { // Pick a product in an array based on rarity property value
            Math.seedrandom(); var random = Math.random();
            var picked = pickInArray(eventProducts[type]);
            while(picked.rarity > random) {
                picked = pickInArray(eventProducts[type]);
            }
            return picked;
        };
        var pickInObject = function(object) { // Return a random property from input object
            var array = [];
            for(var key in object) { if(object.hasOwnProperty(key)) { array.push(object[key]); } }
            return array[Math.floor(Math.random()*array.length)];
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
        var isCampNear = function(camps,loc,dist) { // Check a diamond area around x,y for a camp
            var neighbors = [];
            loc = [parseInt(loc[0]),parseInt(loc[1])];
            for(var i = dist*-1; i <= dist; i++) {
                for(var ii = dist*-1; ii <= dist; ii++) {
                    var total = Math.abs(i)+Math.abs(ii);
                    if(total <= dist && total > 0) {
                        if(camps.indexOf((loc[0]+i)+':'+(loc[1]+ii)) >= 0) { return true; }
                    }
                }
            }
            return false;
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
        var genCampEconomy = function(grid,terrain) {
            Math.seedrandom(grid);
            var economy = {};
            for(var resKey in resources) {
                if(resources.hasOwnProperty(resKey)) {
                    var res = resources[resKey];
                    // TODO: Supply and demands influenced by location & terrain 
                    // Create module functions with coefficient parameters to handle this
                    var random = Math.random();
                    economy[resKey] = {};
                    economy[resKey].supply = 
                        parseInt((random * 10 * res.abundance)/res.value);
                    economy[resKey].demand = 
                        parseInt((1 - random)*100);
                    economy[resKey].value = parseInt(res.value * (economy[resKey].demand / 50));
                    economy[resKey].value = economy[resKey].value < 1 ? 1 : economy[resKey].value;
//                    console.log(resKey,'-',parseInt(random*100),'---------------------------------');
//                    console.log('supply:',economy[resKey].supply);
//                    console.log('demand:',economy[resKey].demand);
//                    console.log('abundance:',res.abundance,'raw value:',res.value);
//                    console.log('camp value:',economy[resKey].value);
                }
            }
            return economy;
        };
        // Generate pool of resources for event
        var createEventPool = function(eventType) {
            var pool = [], number, i, product, item;
            var typesChosen = []; // Prevent 2 instances of same product
            switch(eventType) {
                case 'forage':
                    number = randomIntRange(2,4);
                    for(i = 0; i < number; i++) {
                        product = pickProduct(eventType);
                        while(jQuery.inArray(product.name,typesChosen) >= 0) { // Prevent duplicates
                            product = pickProduct(eventType);
                        }
                        typesChosen.push(product.name);
                        item = { type: 'plant', product: product,
                            targetX: randomIntRange(100,199), targetY: randomIntRange(100,199) };
                        item.product.amount = item.product.avgQty + randomIntRange(0,2);
                        pool.push(item);
                    }
                    break;
                case 'hunt':
                    number = randomIntRange(0,2) || 1; // 33% chance of there being 2 animals
                    for(i = 0; i < number; i++) {
                        product = pickProduct(eventType);
                        item = { type: 'animal', product: product,
                            targetX: randomIntRange(100,199), targetY: randomIntRange(100,199) };
                        pool.push(item);
                    }
                    break;
            }
            return pool;
        };
        var createEventTimers = function(eventType,stepsPerItem,stepLength,pauseLength) {
            event.step = 'start';
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
            setupActivity: function(type) {
                Math.seedrandom();
                event.pool = createEventPool(type); event.result = {};
                event.seed = randomIntRange(0,1000); // For consistent redrawing
                actCanvasUtility.drawActivity(type,event);
                switch(type) {
                    case 'hunt': createEventTimers(type,4,500,800); break;
                }
            },
            playActivity: function(type,click,skill) {
                skill = skill ? Math.floor(skill / 10) : 0;
                event.result.success = false; event.result.products = [];
                var poolCopy = angular.copy(event.pool), threshold, i, dist, product, j;
                switch(type) {
                    case 'forage':
                        threshold = 225 + skill*skill;
                        for(i = 0; i < poolCopy.length; i++) {
                            dist = (click.x - poolCopy[i].targetX)*(click.x - poolCopy[i].targetX) +
                                (click.y - poolCopy[i].targetY)*(click.y - poolCopy[i].targetY);
                            if(dist < threshold) {
                                event.result.success = true;
                                product = poolCopy[i].product; delete product.avgQty; product.type = 'plant';
                                product.amount = Math.ceil(product.amount*((threshold-dist)/threshold));
                                event.pool.splice(i,1); // Remove product from pool
                                actCanvasUtility.drawCircle('main',[poolCopy[i].targetX,poolCopy[i].targetY],
                                    3,'#ffffff'); // Show target
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
                            dist = (click.x - animal.targetX)*(click.x - animal.targetX) +
                                (click.y - animal.targetY)*(click.y - animal.targetY);
                            threshold = 100;
                            if(dist < threshold) {
                                event.result.success = true;
                                actCanvasUtility.drawCircle('main',[animal.targetX,animal.targetY],
                                    10,'#ff0000');
                                product = animal.product; product.amount = 1; product.type = 'animal';
                                delete product.rarity;
                                event.result.products.push(product);
                            }
                        }
                        if(event.step == 'end') {
                            event.result.ended = true;
                        }
                        if(!event.result.success) { // If event failed
                            clearTimeout(event.timer);
                            event.result.ended = true;
                        }
                        break;
                }
                event.result.message = event.result.success || event.step == 'end' ? 
                    event.result.ended ? eventMessages.ended[type] : eventMessages.success[type] 
                        : eventMessages.failure[type];
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
            createUserCamp: function(terrain,camps) {
                Math.seedrandom();
                for(var i = 0; i < 5000; i++) {
                    var x = randomIntRange(20,279), y = randomIntRange(20,279);
                    if(terrain[x+':'+y] && !camps[x+':'+y] && terrain[x+':'+y] < 10) { 
                        return x+':'+y; 
                    }
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
                            var invItem = user.inventory[invKey];
                            if(edibles.hasOwnProperty(invItem.name) && invItem.name == user.autoEat[a]
                                && neededHunger > 0) {
                                var foodItem = edibles[invItem.name];
                                var eatAmount = Math.floor(neededHunger/foodItem.calories);
                                eatAmount = eatAmount > invItem.amount ? invItem.amount : eatAmount;
                                neededHunger -= foodItem.calories * eatAmount;
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
            resources: resources, event: event, eventMessages: eventMessages, edibles: edibles
        }
});