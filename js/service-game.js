/* Game logic service */

angular.module('Geographr.game', [])
.factory('gameUtility', function(colorUtility) {
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
                    if(camps.hasOwnProperty((loc[0]+i)+':'+(loc[1]+ii))) { return true; }
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
            var camps = {};
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
                        camps[tKey] = 1;
                    }
                }
            }
            return camps;
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
        }
    }
});