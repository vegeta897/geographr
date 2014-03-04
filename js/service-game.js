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
    var newNode = function(nodes,newNodes,ox,oy,nx,ny) {
        
    };
    var stressNodes = function(nodes) { // Thanks morgs
        for(var i = 0; i < nodes.length; i++) {
            nodes[i].depth++;
        }
        return nodes;
    };
    return {
        tapNode: function(nodes,ox,oy) { // ox and oy are the clicked coords
            // TODO: Overhaul this shit
            Math.seedrandom(); console.log('TAP!');
            var theTime = new Date().getTime();
            var oCoords = ''; // Origin node coordinates (will use nearby node if possible)
            var newNodes = {}; // New nodes to be returned
            var dist = 0, angle = 0, ndx = 0, ndy = 0, newNode = '';
            if(!nodes) { nodes = {}; } // If there are no nodes, create a blank nodes object
            
            // If no nearby nodes, create new node with possible children
            if(getCircle(nodes,ox,oy,6).length == 0) { // No nearby nodes
                console.log('no nearby nodes');
                var newNodeDepth = randomIntRange(1,2);
                newNodes[ox+':'+oy] = { depth: newNodeDepth, created: theTime, connected: [] };
                var lastAngle = Math.random() * 360;
                for(var i = 0; i < randomIntRange(0,2); i++) { // Use remaining power to make nodes
                    dist = randomRange(6 - i*2,6);
                    angle = lastAngle + 120 + Math.random() * 40;
                    lastAngle = angle;
                    ndx = Math.floor((dist * Math.cos(toRadians(angle-90))));
                    ndy = Math.floor((dist * Math.sin(toRadians(angle-90))));
                    newNodes[(ox+ndx)+':'+(oy+ndy)] = { depth: 1, created: theTime, 
                        connected: [ox+':'+oy] };
                    newNodes[ox+':'+oy].connected.push((ox+ndx)+':'+(oy+ndy));
                }
            // If a node is on or right next to the clicked spot
            } else if(nodes.hasOwnProperty(ox+':'+oy) || getBoxNeighbors(nodes,ox,oy,1).length > 0) {
                console.log('node on or right next to clicked spot');
                oCoords = nodes.hasOwnProperty(ox+':'+oy) ? ox+':'+oy : getBoxNeighbors(nodes,ox,oy,1)[0];
                ox = parseInt(oCoords.split(':')[0]); oy = parseInt(oCoords.split(':')[1]); // Update origin coords
                newNodes[ox+':'+oy] = nodes[ox+':'+oy];
                newNodes[ox+':'+oy].depth += 1;
                nodes[ox+':'+oy].connected = nodes[ox+':'+oy].connected ? nodes[ox+':'+oy].connected : [];
                // For each connected node we're going to stress and traverse
                for(var j = 0; j < nodes[ox+':'+oy].connected.length; j++) { 
                    console.log('Beginning stress/traverse of node',(j+1),'of',nodes[ox+':'+oy].connected.length);
                    var thisNode = nodes[ox+':'+oy].connected[j];
                    // Chance to increase depth
                    if(Math.random() > 0.7) {
                        nodes[thisNode].depth += 1;
                        newNodes[thisNode] = nodes[thisNode];
                    }
                    var lastNode = ox+':'+oy;
                    var branchLength = 1;
                    var branchDepths = nodes[thisNode].depth;
                    var branchNodes = [lastNode]; // Store nodes in this branch
                    // Traverse the path, stressing nodes along the way
                    // While the path continues, we haven't already been to this node, and we haven't gone too far
                    while(nodes[thisNode].connected.length > 1 && !inArray(thisNode,branchNodes) && branchLength < 6) { 
                        branchLength++;
                        branchNodes.push(thisNode);
                        branchDepths += nodes[thisNode].depth;
                        if(Math.random() > nodes[lastNode].depth/10) { // Decide whether to stress this node
                            nodes[thisNode].depth += 1;
                            newNodes[thisNode] = nodes[thisNode];
                        }
                        for(var k = 0; k < nodes[thisNode].connected.length; k++) { // Get next node in path
                            if(!nodes[thisNode].hasOwnProperty('connected')) { 
                                console.log('no connected property!'); break; 
                            }
                            // Make sure we're not backtracking or going in circles
                            if(!inArray(nodes[thisNode].connected[k], branchNodes)) {
                                lastNode = thisNode;
                                thisNode = nodes[thisNode].connected[k];
                                break;
                            }
                        }
                        if(branchLength > 100) {console.log('traversing loop!');break;}
                    }
                    newNodes[thisNode] = nodes[thisNode];
                    // Now that we're at the last node, decide whether to extend the branch
                    if(Math.random() > (branchDepths/branchLength) / 5) {
                        console.log('extending branch');
                        var thisX = parseInt(thisNode.split(':')[0]), thisY = parseInt(thisNode.split(':')[1]);
                        var nearExtNode = getCircle(nodes, thisX, thisY, 6);
                        var nearestToExt = getNearest(thisX,thisY,nearExtNode,nodes[thisNode].connected);
                        console.log('excluding:',nodes[thisNode].connected);
                        if(nearestToExt != '') { // If there is a nearby node to connect to
                            newNode = nearestToExt;
                            console.log('while extending, a nearby node was found:',newNode);
                            newNodes[newNode] = nodes[newNode];
                            newNodes[newNode].depth++;
                            newNodes[newNode].connected = newNodes[newNode].hasOwnProperty('connected') ?
                                newNodes[newNode].connected : [];
                            newNodes[newNode].connected.push(thisNode);
                        } else { // If no nearby node, extend the path with a new node
                            var lastDelta = [thisX - lastNode.split(':')[0], thisY - lastNode.split(':')[1]];
                            angle = toDegrees(Math.atan2(lastDelta[0],lastDelta[1]*-1));
                            angle = angle + Math.random() * 70 - 35;
                            dist = randomRange(4,6);
                            ndx = Math.floor((dist * Math.cos(toRadians(angle-90))));
                            ndy = Math.floor((dist * Math.sin(toRadians(angle-90))));
                            newNode = (thisX + ndx) + ':' + (thisY + ndy);
                            newNodes[newNode] = nodes[newNode] = {
                                depth: 1, created: theTime, connected: [thisNode]
                            };
                            var nearNewExtNode = getCircle(nodes, (thisX + ndx), (thisY + ndy), 3);
                            var nearestToNewExt = getNearest((thisX + ndx),(thisY + ndy),
                                nearNewExtNode,nodes[newNode].connected);
                            if(nearestToNewExt != '') {
                                console.log('a node was found very close to the new node');
                                newNodes[nearestToNewExt] = newNodes.hasOwnProperty(nearestToNewExt) ?
                                    newNodes[nearestToNewExt] : nodes[nearestToNewExt];
                                newNodes[nearestToNewExt].depth++;
                                newNodes[nearestToNewExt].connected = newNodes[nearestToNewExt].hasOwnProperty('connected') ?
                                    newNodes[nearestToNewExt].connected : [];
                                newNodes[nearestToNewExt].connected.push(newNode);
                            }
                        }
                        newNodes[thisNode].connected = newNodes[thisNode].connected ?
                            newNodes[thisNode].connected : [];
                        newNodes[thisNode].connected.push(newNode);
                    }
                }
                // Create nodes off clicked node based on how many already exist
                console.log('already connected:',nodes[ox+':'+oy].connected.length);
                for(var l = 0; l < randomIntRange(1,3) - nodes[ox+':'+oy].connected.length; l++) {
                    newNodes[ox+':'+oy].connected = newNodes[ox+':'+oy].hasOwnProperty('connected') ?
                        newNodes[ox+':'+oy].connected : [];
                    var nearNewNode = getCircle(nodes, ox, oy, 6);
                    var nearest = getNearest(ox, oy, nearNewNode, nodes[ox+':'+oy].connected);
                    if(nearest != '') { // If there is a nearby node to connect to
                        newNode = nearest;
                        console.log('while creating new node off clicked node, a nearby node was found:',newNode);
                        newNodes[newNode] = nodes[newNode];
                        newNodes[newNode].depth++;
                        newNodes[newNode].connected = newNodes[newNode].hasOwnProperty('connected') ?
                            newNodes[newNode].connected : [];
                        newNodes[newNode].connected.push(ox+':'+oy);
                    } else { // If no nearby node, make a new one
                        var angles = [];
                        // Get angles of connected nodes
                        for(var m = 0; m < nodes[ox+':'+oy].connected.length; m++) {
                            var nearX = nodes[ox+':'+oy].connected[m].split(':')[0],
                                nearY = nodes[ox+':'+oy].connected[m].split(':')[1];
                            var delta = [nearX - ox, nearY - oy];
                            angles.push(toDegrees(Math.atan2(delta[0],delta[1]*-1)));
                        }
                        var newAngle = angles.length == 0 ? Math.random()*360 : 0;
                        if(angles.length == 1) {
                            newAngle = angles[0] + 180 + Math.random()*70 - 35;
                        } else if(angles.length == 2) {
                            if(Math.abs(angles[0] - angles[1]) > 180) {
                                if(angles[0] < angles[1]) { angles[0] += 360; } else { angles[1] += 360; }
                            }
                            newAngle = (angles[0] + angles[1])/2 + 180 + Math.random()*70 - 35;
                        }
                        dist = randomRange(4,6);
                        ndx = Math.floor((dist * Math.cos(toRadians(newAngle-90))));
                        ndy = Math.floor((dist * Math.sin(toRadians(newAngle-90))));
                        newNode = (ox + ndx) + ':' + (oy + ndy);
                        newNodes[newNode] = nodes[newNode] = {
                            depth: 1, created: theTime, connected: [ox+':'+oy]
                        };
                        var nearNewCreatedNode = getCircle(nodes, (thisX + ndx), (thisY + ndy), 3);
                        var nearestToNew = getNearest((thisX + ndx),(thisY + ndy),
                            nearNewCreatedNode,nodes[newNode].connected);
                        if(nearestToNew != '') {
                            console.log('a node was found very close to the new node');
                            newNodes[nearestToNew] = newNodes.hasOwnProperty(nearestToNew) ? 
                                newNodes[nearestToNew] : nodes[nearestToNew];
                            newNodes[nearestToNew].depth++;
                            newNodes[nearestToNew].connected = newNodes[nearestToNew].hasOwnProperty('connected') ?
                                newNodes[nearestToNew].connected : [];
                            newNodes[nearestToNew].connected.push(newNode);
                        }
                    }
                    console.log('adding',newNode,'to connected nodes of',ox+':'+oy);
                    newNodes[ox+':'+oy].connected.push(newNode);
                }
            // If a node(s) is nearby but not on or next to clicked spot
            } else {
                console.log('node(s) nearby');
                var reallyNearNodes = getCircle(nodes,ox,oy,4);
                // Chance to create node on clicked spot based on how many nodes nearby
                if(Math.random() > reallyNearNodes.length / 4) {
                    console.log('creating new node on clicked spot');
                    newNodes[ox+':'+oy] = {
                        depth: 1, created: theTime, connected: []
                    };
                }
                var nearNodes = getCircle(nodes,ox,oy,6);
                for(var n = 0; n < nearNodes.length; n++) {
                    var nnx = nearNodes[n].split(':')[0], nny = nearNodes[n].split(':')[1];
                    var nearNodeDist = (nnx - ox) * (nnx - ox) + (nny - oy) * (nny - oy);
                    if(Math.random() > nearNodeDist/36) { // Stress chance based on distance
                        newNodes[nearNodes[n]] = nodes[nearNodes[n]];
                        newNodes[nearNodes[n]].depth++;
                        if(newNodes.hasOwnProperty(ox+':'+oy)) {
                            newNodes[ox+':'+oy].connected.push(nearNodes[n]);
                            newNodes[nearNodes[n]].connected = newNodes[nearNodes[n]].hasOwnProperty('connected') ?
                                newNodes[nearNodes[n]].connected : [];
                            newNodes[nearNodes[n]].connected.push(ox+':'+oy);
                        }
                    }
                    // Connect nearby nodes to others nearby based on how many already connected
                    var connected = nodes[nearNodes[n]].hasOwnProperty('connected') ? 
                        nodes[nearNodes[n]].connected.length : 0;
                    var nearNearNode = getCircle(nodes,nnx,nny,6);
                    for(var o = 0; o < nearNearNode.length; o++) {
                        if(nearNodes[n] != nearNearNode[o] && Math.random() > connected/4 + 0.1) {
                            newNodes[nearNearNode[o]] = nodes[nearNearNode[o]];
                            newNodes[nearNearNode[o]].connected = newNodes[nearNearNode[o]].hasOwnProperty('connected') ?
                                newNodes[nearNearNode[o]].connected : [];
                            newNodes[nearNearNode[o]].connected.push(nearNodes[n]);
                            newNodes[nearNodes[n]] = nodes[nearNodes[n]];
                            newNodes[nearNodes[n]].connected = newNodes[nearNodes[n]].hasOwnProperty('connected') ?
                                newNodes[nearNodes[n]].connected : [];
                            newNodes[nearNodes[n]].connected.push(nearNearNode[o]);
                        }
                    }
                }
            }
            for(var key in newNodes) { // Limit node depth to 10
                if(newNodes.hasOwnProperty(key)) {
                    newNodes[key].depth = newNodes[key].depth > 10 ? 10 : newNodes[key].depth;
                }
            }
            return newNodes;
        },
        tutorial: function(step) {
            var text = '';
            switch(parseInt(step)) {
                case 0:
                    text = 'Tap on the ice for points.\n' +
                        'Be careful where you tap. Breaking off shards of ice will result in a severe penalty!';
                    break;
            }
            return text;
        },
        capitalize: function(string) {
            return string.charAt(0).toUpperCase() + string.slice(1);
        }
    }
});