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
        for(var i = dist*-1; i <= dist; i++) {
            for(var ii = dist*-1; ii <= dist; ii++) {
                var total = Math.abs(i)+Math.abs(ii);
                if(total <= dist && total > 0) {
                    neighbors.push((loc[0]+i)+':'+(loc[1]+ii));
                }
            }
        }
        return neighbors;
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
    var getCircle = function(nodes,x,y,dist) { // Check circular area around x,y
        var neighbors = [];
        x = parseInt(x); y = parseInt(y);
        for(var i = dist*-1; i <= dist; i++) {
            for(var ii = dist*-1; ii <= dist; ii++) {
                var nx = (x+i), ny = (y+ii);
                if(dist*dist > i*i + ii*ii && nodes.hasOwnProperty(nx+':'+ny)) {
                    neighbors.push(nx+':'+ny); 
                }
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
        newMap: function() {
            var map = {};
            for(var i = 0; i < 240; i++) {
                for(var ii = 0; ii < 150; ii++) {
                    map[i + ':' + ii] = 'water-deep';
                }
            }
            return map;
        },
        someGameFunction: function(ox,oy) { // ox and oy are the clicked coords
           // Placeholder game function!
        },
        tutorial: function(step) {
            var text = '';
            switch(parseInt(step)) {
                case 0:
                    text = 'Click on the map to influence the terrain.\n' +
                        'That\'s about all I got so far.';
                    break;
            }
            return text;
        },
        capitalize: function(string) {
            return string.charAt(0).toUpperCase() + string.slice(1);
        }
    }
});