/* Game logic service */

angular.module('Geographr.game', [])
.factory('gameUtility', function(actCanvasUtility) {
        var resourceList = ['lumber', 'fish','fruit','vegetables', 'meat', 'salt', 'coal', 'iron', 
            'wool', 'tools', 'weapons', 'spices'];
        var valuePerWeight = [1,7,6,5,7,3,2,4,6,5,6,10]; // Base value per weight (carry capacity)
            
        var event = {}; // Holds event details
        var eventMessages = { // Event messages/instructions to show user
            instructions: {
                forage: '<strong>Click</strong> where the 3 lines would <strong>intersect!</strong>',
                hunt: '<strong>Click</strong> where the 3 lines would <strong>intersect!</strong>'
            },
            success: {
                forage: 'You found <strong>some plants</strong> while foraging.',
                hunt: 'You killed an <strong>innocent animal.</strong>'
            },
            failure: {
                forage: 'You search for edible plants but <strong>find nothing</strong>.',
                hunt: 'You <strong>couldn\'t find any animals</strong> to hunt.'
            }
        };
        var eventProducts = {
            forage: [
                { name: 'red berries', color: '9e3333', avgQty: 3 },
                { name: 'blue berries', color: '334c9e', avgQty: 2 },
                { name: 'green berries', color: '689e48', avgQty: 3 },
                { name: 'brown mushrooms', color: '6f6053', avgQty: 3 },
                { name: 'white mushrooms', color: 'b0a9a4', avgQty: 2 },
                { name: 'herbs', color: '728448', avgQty: 2 },
                { name: 'onions', color: 'aaa982', avgQty: 1 }
            ],
            hunt: ['deer','boar','rabbit','fox','wolf','mole']
        };
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
            for(var i = 0; i < resourceList.length; i++) {
                var res = resourceList[i];
                // TODO: Supply and demands influenced by location & terrain 
                // Create module functions with coefficient parameters to handle this
                economy[res] = {};
                economy[res].supply = parseInt(Math.random() * 100);
                economy[res].demand = parseInt(100 - economy[res].supply + Math.random() * 30 - 20);
                economy[res].supply = parseInt(economy[res].supply/valuePerWeight[i]);
                economy[res].demand = economy[res].demand > 100 ? 100 : // Keep in 0-100 range
                    economy[res].demand < 1 ? 1 : economy[res].demand;
                economy[res].value = (parseInt(valuePerWeight[i] * (economy[res].demand / 50)) || 1);
                economy[res].valPerWeight = valuePerWeight[i];
            }
            return economy;
        };
        // Generate pool of resources for event
        var createEventPool = function(eventType) {
            var pool = [];
            var typesChosen = []; // Prevent 2 instances of same product
            switch(eventType) {
                case 'forage':
                    var number = randomIntRange(2,7);
                    for(var i = 0; i < number; i++) {
                        var product = pickInArray(eventProducts[eventType]);
                        while(jQuery.inArray(product.name,typesChosen) >= 0) { // Prevent duplicates
                            product = pickInArray(eventProducts[eventType]);
                        }
                        typesChosen.push(product.name);
                        var item = { type: 'plant', product: product,
                            targetX: randomIntRange(100,199), targetY: randomIntRange(100,199) };
                        item.product.amount = item.product.avgQty + randomIntRange(0,2);
                        pool.push(item);
                    }
                    break;
            }
            console.log(typesChosen);
            return pool;
        };
        
        return {
            setupActivity: function(type) {
                Math.seedrandom();
                switch(type) {
                    case 'forage':
                        event.pool = createEventPool(type); event.result = { products: [] }; 
                        event.seed = randomIntRange(0,1000); // For consistent redrawing
                        break;
                }
                actCanvasUtility.drawActivity(type,event.pool,event.seed);
            },
            playActivity: function(type,click,skill) {
                skill = skill ? Math.floor(skill / 10) : 0;
                switch(type) {
                    case 'forage':
                        var poolCopy = angular.copy(event.pool);
                        var threshold = 225 + skill*4;
                        for(var i = 0; i < poolCopy.length; i++) {
                            var dist = (click.x - poolCopy[i].targetX)*(click.x - poolCopy[i].targetX) +
                                (click.y - poolCopy[i].targetY)*(click.y - poolCopy[i].targetY);
                            if(dist < threshold) {
                                event.result.success = true;
                                var product = poolCopy[i].product; delete product.avgQty; product.type = 'plant';
                                product.amount = Math.ceil(product.amount*((threshold-dist)/threshold));
                                event.pool.splice(i,1); // Remove product from pool
                                actCanvasUtility.drawCircle('main',[poolCopy[i].targetX,poolCopy[i].targetY],
                                    3,'#ffffff'); // Show target
                                actCanvasUtility.drawLine('main',[click.x,click.y], // Show delta
                                    [poolCopy[i].targetX,poolCopy[i].targetY],'#00ff00');
                                setTimeout(function() {
                                    actCanvasUtility.drawActivity(type,event.pool,event.seed); },1000); // Redraw
                                event.result.products.push(product);
                                break; // Only one product foraged per click
                            }
                        }
                        break;
                }
                event.result.message = event.result.success ? eventMessages.success[type] 
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
            resourceList: resourceList, valuePerWeight: valuePerWeight, event: event, 
            eventMessages: eventMessages
        }
});