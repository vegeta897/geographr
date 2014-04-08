/* Activity canvas drawing service */

angular.module('Geographr.actCanvas', [])
.factory('actCanvasUtility', function(canvasUtility) {
        var eventLowCanvas = document.getElementById('eventLowCanvas'); // Event view
        var eventMainCanvas = document.getElementById('eventMainCanvas');
        var eventHighCanvas = document.getElementById('eventHighCanvas');
        var eventLowContext = eventLowCanvas.getContext ? eventLowCanvas.getContext('2d') : null;
        var eventMainContext = eventMainCanvas.getContext ? eventMainCanvas.getContext('2d') : null;
        var eventHighContext = eventHighCanvas.getContext ? eventHighCanvas.getContext('2d') : null;
        eventLowCanvas.onselectstart = function() { return false; };
        eventMainCanvas.onselectstart = function() { return false; };
        eventHighCanvas.onselectstart = function() { return false; };
        var flip = function() { return Math.random() > 0.5; }; // Flip a coin
        var clear = function() {
            canvasUtility.fillCanvas(eventLowContext,'24272b');
            eventMainContext.clearRect(0,0,300,300);
            eventHighContext.clearRect(0,0,300,300);
        };
        return {
            fillCanvas: function(context,color) {
                var method = color == 'erase' ? 'clearRect' : 'fillRect';
                if(color != 'erase') { context.fillStyle = color.charAt(0) == 'r' ? color : '#' + color; }
                context[method](0,0,1200,750);
            },
            drawActivity: function(type,pool,seed) {
                clear(); // Clear event canvases
                switch(type) {
                    case 'forage':
                        for(var p = 0; p < pool.length; p++) {
                            eventMainContext.beginPath();
                            eventMainContext.strokeStyle = '#' + pool[p].product.color;
                            // Line width based on product amount above average
                            eventMainContext.lineWidth = 1 + (pool[p].product.amount - pool[p].product.avgQty)/2;
                            Math.seedrandom(seed+pool[p].targetX); // Consistent event redraws
                            for(var i = 0; i < 3; i++) {
                                switch(Math.floor(Math.random()*4)) {
                                    case 0: eventMainContext.moveTo(0,Math.floor(Math.random()*300)); break;
                                    case 1: eventMainContext.moveTo(300,Math.floor(Math.random()*300)); break;
                                    case 2: eventMainContext.moveTo(Math.floor(Math.random()*300),0); break;
                                    case 3: eventMainContext.moveTo(Math.floor(Math.random()*300),300); break;
                                }
                                eventMainContext.lineTo(pool[p].targetX,pool[p].targetY);
                            }
                            eventMainContext.stroke();
                        }
                        eventMainContext.clearRect(50,50,200,200);
                        break;
                }
            },
            eventHighCanvas: jQuery(eventHighCanvas)
        }
});