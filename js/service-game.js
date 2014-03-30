/* Game logic service */

angular.module('Geographr.game', [])
.factory('gameUtility', function(colorUtility) {
    var resourceList = ['lumber', 'fish','fruit','vegetables', 'meat', 'salt', 'coal', 'iron', 
        'wool', 'tools', 'weapons', 'spices'];
    var valuePerWeight = [1,7,6,5,7,3,2,4,6,5,6,10]; // Base value per weight (carry capacity)
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
            if(inArray(nx+':'+ny,exclude)) { console.log('excluded!'); continue; } // Not in excluded list
            if(nx == ox && ny == oy) { console.log('self!'); continue; } // Not self
            if((nx - ox) * (nx - ox) + (ny - oy) * (ny - oy) < nearest.dist) {
                nearest.coords = near[i]; nearest.dist = (nx - ox) * (nx - ox) + (ny - oy) * (ny - oy);
            }
        }
        return nearest.coords;
    };
    var inArray = function(value,array) {
        for(var i = 0; i < array.length; i++) {
            if(array[i] == value) { return true; }
        }
        return false;
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
    return {
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
            var x = grid.split(':')[0], y = grid.split(':')[1];
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
        resourceList: resourceList, valuePerWeight: valuePerWeight
    }
});