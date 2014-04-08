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
        var mouse = [-1,-1];
        eventHighCanvas.style.cursor = 'crosshair';
        jQuery(eventHighCanvas).on('mousemove',function(e) {
            return; // Not using this for now
            var offset = jQuery(eventHighCanvas).offset(); // Get pixel location
            var x = e.pageX - offset.left < 0 ? 0 : Math.floor((e.pageX - offset.left));
            var y = e.pageY - offset.top < 0 ? 0 : Math.floor((e.pageY - offset.top));
            if(mouse[0] != x && mouse[1] != y) {
                mouse = [x,y];
            }
        });
        var bgColor = '24272b';
        var flip = function() { return Math.random() > 0.5; }; // Flip a coin
        var clear = function() {
            canvasUtility.fillCanvas(eventLowContext,bgColor);
            eventMainContext.clearRect(0,0,300,300);
            eventHighContext.clearRect(0,0,300,300);
        };
        var drawNoiseLines = function(count,intensity) {
            for(var i = 0; i < count; i++) {
                eventLowContext.beginPath();
                switch(Math.floor(Math.random()*2)) {
                    case 0: eventLowContext.moveTo(0,Math.floor(Math.random()*300));
                        eventLowContext.lineTo(300,Math.floor(Math.random()*300)); break;
                    case 1: eventLowContext.moveTo(Math.floor(Math.random()*300),0);
                        eventLowContext.lineTo(Math.floor(Math.random()*300),300); break;
                }
                var alpha = ',' + Math.floor(Math.random()*intensity)/100;
                eventLowContext.strokeStyle = 'rgba(200,200,200' + alpha + ')'; eventLowContext.stroke();
            }
        };
        return {
            fillCanvas: function(context,color) {
                var method = color == 'erase' ? 'clearRect' : 'fillRect';
                if(color != 'erase') { context.fillStyle = color.charAt(0) == 'r' ? color : '#' + color; }
                context[method](0,0,1200,750);
            },
            drawLine: function(which,pointA,pointB,color) {
                var context = which == 'low' ? eventLowContext : 
                    which == 'main' ? eventMainContext : eventHighContext;
                context.lineWidth = 1; context.strokeStyle = color;
                context.beginPath();
                context.moveTo(pointA[0],pointA[1]); context.lineTo(pointB[0],pointB[1]);
                context.stroke();
            },
            drawCircle: function(which,location,size,color) {
                var context = which == 'low' ? eventLowContext :
                    which == 'main' ? eventMainContext : eventHighContext;
                context.beginPath();
                context.arc(location[0],location[1],size, 0, Math.PI*2);
                context.closePath(); context.fillStyle = color; context.fill();
            },
            drawActivity: function(type,pool,seed) {
                clear(); // Clear event canvases
                switch(type) {
                    case 'forage':
                        Math.seedrandom(seed); drawNoiseLines(9,35); // Consistent noise
                        for(var p = 0; p < pool.length; p++) {
                            eventMainContext.beginPath();
                            eventMainContext.strokeStyle = '#' + pool[p].product.color;
                            // Line width based on product amount above average
                            eventMainContext.lineWidth = 1 + (pool[p].product.amount - pool[p].product.avgQty)/1.5;
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