angular.module('Geographr.controllerMain', [])
.controller('Main', ['$scope', '$timeout', 'localStorageService', 'colorUtility', 'canvasUtility', 'actCanvasUtility', 'gameUtility', function($scope, $timeout, localStorage, colorUtility, canvasUtility, actCanvasUtility, gameUtility) {
        $scope.version = 0.307; $scope.versionName = 'Polite Chaos'; $scope.needUpdate = false;
        $scope.commits = { list: [], show: false }; // Latest commits from github api
        $scope.zoomLevel = 4; $scope.zoomPosition = [120,120]; // Tracking zoom window position
        $scope.overPixel = { x: '-', y: '-', slope: '-', elevation: '-', type: '-', forest: '-' }; // Mouse over info
        $scope.onPixel = {}; $scope.login = { email: '', password: '' };
        $scope.authStatus = ''; $scope.helpText = ''; $scope.lastTerrainUpdate = 0; $scope.terrainReady = false;
        $scope.placingObject = {}; $scope.mapElements = { labels: true, objects: true, overlay: 'none' };
        $scope.editTerrain = false; $scope.smoothTerrain = false; $scope.uiOptions = {};
        $scope.brushSize = 0; $scope.lockElevation = false; $scope.lockedElevation = 1;
        $scope.eventLog = []; $scope.tutorialSkips = []; $scope.skipTutorial = false;
        $scope.movePath = []; $scope.lookCount = 0;
        $scope.showItemTypes = {'animal':true,'fish':true,'fruit':true,'gem':true,'metal':true,'plant':true,
            'tool':true,'weapon':true,'vegetable':true,'other':true}; 
        $scope.showService = {}; $scope.services = ['blacksmith','jeweler'];
        setInterval(function(){$timeout(function(){});},60000); // Refresh scope every minute
        gameUtility.attachScope($scope);
        var mainPixSize = 1, zoomPixSize = 20, zoomSize = [45,30], lastZoomPosition = [0,0], viewCenter, panOrigin,
            keyPressed = false, keyUpped = true, panMouseDown = false,  dragPanning = false, pinging = false, 
            localTerrain = {}, updatedTerrain = {}, terrainFeatures = {}, localObjects = {}, 
            localUsers = {}, localLabels = {}, addingLabel = false, zoomLevels = [4,6,10,12,20,30,60], fireInventory, 
            tutorialStep = 0, visiblePixels = {}, waitTimer, campList = [], userID, fireUser,
            availableActivities = [], abundances = {}, controlsDIV, progressBar, objectInfoPanel;
    
        // Create a reference to the pixel data for our canvas
        var fireRef = new Firebase('https://geographr.firebaseio.com/map1'); gameUtility.attachFireRef(fireRef);
        var fireServer = fireRef.child('clients/actions');
        var auth; // Create a reference to the auth service for our data
        if(navigator.userAgent.toLowerCase().indexOf('firefox') > -1) { $scope.firefox = true; return; }
        fireRef.parent().child('version').once('value', function(snap) { // Check version number
            if($scope.version >= snap.val()) {
                fireRef.parent().child('version').on('value',function(snap) {
                    if($scope.version >= snap.val()) { return; }
                    $timeout(function() {
                        $scope.needUpdate = true; $scope.authStatus = ''; $scope.userInit = false;
                        $scope.user = $scope.onPixel = null;
                        jQuery(zoomHighCanvas)
                            .unbind('mousemove').unbind('mousedown').unbind('mouseup').unbind('mousewheel');
                        jQuery(fullHighCanvas).unbind('mousedown').unbind('mouseup').unbind('mousewheel');
                    });
                });
                var initUser = function() { fireUser.once('value', function(snap) { $timeout(function() {
                    $scope.user = snap.val(); $scope.userInit = true; $scope.authStatus = 'logged';
                    $scope.camp = snap.val().camp; 
                    $scope.movePath = snap.val().movement ? snap.val().movement.movePath || [] : [];
                    $scope.moving = $scope.movePath.length > 0;
                    visiblePixels = snap.val().hasOwnProperty('visiblePixels') ? snap.val().visiblePixels : {};
                    fireRef.child('scoreBoard').on('value', function(snap) {
                        $scope.scoreBoard= []; var scoreSnap = snap.val();
                        localUsers = scoreSnap;
                        for(var key in snap.val()) { if(!scoreSnap.hasOwnProperty(key)) { continue; }
                            $scope.scoreBoard.push({ nick: scoreSnap[key].nick, score: scoreSnap[key].score,
                                online: scoreSnap[key].online, color: scoreSnap[key].color });
                        }
                        $timeout(function() { 
                            $scope.scoreBoard = sortArrayByProperty($scope.scoreBoard,'score',true); });
                    });
                    if($scope.user.new) { tutorialStep = -1; } else { tutorialStep = 0; } tutorial('next');
                    initTerrain();
                    fireUser.child('money').on('value',
                        function(snap) { $timeout(function() {$scope.user.money = snap.val();}); });
                    fireInventory = fireUser.child('inventory');
                    fireInventory.on('child_added', updateInventory);
                    fireInventory.on('child_changed', updateInventory);
                    fireInventory.on('child_removed', removeInventory);
                    gameUtility.attachFireInventory(fireInventory);
                    gameUtility.attachFireUser(fireUser);
                    fireUser.child('equipment').on('value', updateEquipment);
                    fireUser.child('camp').on('value', function(snap) {
                        if(!snap.val()) { return; }
                        var userCamp = { type: 'userCamp', owner: userID,
                            ownerNick: $scope.user.nick, grid: snap.val().grid, color: snap.val().color };
                        if(localObjects.hasOwnProperty(snap.val().grid)) {
                            localObjects[snap.val().grid].userCamp = userCamp;
                        } else { localObjects[snap.val().grid] = { userCamp: userCamp } }
                        drawObject(snap.val().grid.split(':'),localObjects[snap.val().grid]);
                        $scope.user.camp = snap.val();
                    });
                });});};
                auth = new FirebaseSimpleLogin(fireRef, function(error, user) {
                    $timeout(function() {
                        if(error) {
                            console.log(error, $scope.login.email, $scope.login.password);
                            if(error.code == 'INVALID_USER') {
                                auth.createUser($scope.login.email, $scope.login.password,
                                    function(createdError, createdUser) {
                                        if(createdError) { console.log(createdError); } else {
                                            console.log('user created:',createdUser.id,createdUser.email);
                                            userID = createdUser.id;
                                            $scope.user = {id: createdUser.id, email: createdUser.email,
                                                nick: gameUtility.capitalize(createdUser.email.substr(0,
                                                    createdUser.email.indexOf('@'))), new: true };
                                            fireRef.auth(createdUser.token, function() {
                                                fireUser = fireRef.child('users/'+userID);
                                                fireUser.set($scope.user,
                                                    function() { initUser(); });
                                            });
                                        }
                                    });
                            } else if(error.code == 'INVALID_PASSWORD') { $scope.authStatus = 'badPass'; } else
                            if(error.code == 'INVALID_EMAIL') { $scope.authStatus = 'badEmail'; }
                        } else if(user) {
                            console.log('logged in:',user.id,user.email);
                            userID = user.id;
                            fireUser = fireRef.child('users/'+userID);
                            initUser();
                        } else { console.log('logged out'); $scope.authStatus = 'notLogged'; }
                    });
                });
    
                // Authentication
                $scope.authenticate = function(loginEmail,loginPassword) {
                    $scope.authStatus = 'logging';
                    auth.login('password', {email: loginEmail,
                        password: loginPassword, rememberMe: true});
                };
                $scope.logOut = function() { auth.logout(); };
                
            } else { $timeout(function() { $scope.needUpdate = true; } ) }
        });
    
        var tutorial = function(action) {
            if(action == 'init') {
                if(localStorage.get('tutorialStep')) {
                    tutorialStep = localStorage.get('tutorialStep');
                } else { tutorialStep = 0; }
            } else { tutorialStep++; }
            $timeout(function() {
                $scope.helpText = gameUtility.tutorial(tutorialStep);
                localStorage.set('tutorialStep',tutorialStep);
            });
        };
        tutorial('init');
    
        // Attempt to get these variables from localstorage
        var localStores = ['zoomPosition','zoomLevel','lastTerrainUpdate','tutorialSkips','showItemTypes','uiOptions'];
        for(var i = 0; i < localStores.length; i++) { if(localStorage.get(localStores[i])) {
            $scope[localStores[i]] = localStorage.get(localStores[i]);
        }}
    
        // Set up our canvases
        var fullTerrainCanvas = document.getElementById('fullTerrainCanvas'); // Mini-map
        var fullObjectCanvas = document.getElementById('fullObjectCanvas');
        var fullFogCanvas = document.getElementById('fullFogCanvas');
        var fullPingCanvas = document.getElementById('fullPingCanvas');
        var fullHighCanvas = document.getElementById('fullHighCanvas');
//        var zoomTerrainCanvas = document.getElementById('zoomTerrainCanvas'); // Main view
        var zoomObjectCanvas = document.getElementById('zoomObjectCanvas');
        var zoomFogCanvas = document.getElementById('zoomFogCanvas');
        var zoomHighCanvas = document.getElementById('zoomHighCanvas');
        var fullTerrainContext = fullTerrainCanvas.getContext ? fullTerrainCanvas.getContext('2d') : null;
        var fullObjectContext = fullObjectCanvas.getContext ? fullObjectCanvas.getContext('2d') : null;
        var fullFogContext = fullFogCanvas.getContext ? fullFogCanvas.getContext('2d') : null;
        var fullPingContext = fullPingCanvas.getContext ? fullPingCanvas.getContext('2d') : null;
        var fullHighContext = fullHighCanvas.getContext ? fullHighCanvas.getContext('2d') : null;
//        var zoomTerrainContext = zoomTerrainCanvas.getContext ? zoomTerrainCanvas.getContext('2d') : null;
        var zoomObjectContext = zoomObjectCanvas.getContext ? zoomObjectCanvas.getContext('2d') : null;
        var zoomFogContext = zoomFogCanvas.getContext ? zoomFogCanvas.getContext('2d') : null;
        var zoomHighContext = zoomHighCanvas.getContext ? zoomHighCanvas.getContext('2d') : null;
        canvasUtility.fillCanvas(fullFogContext,'2a2f33');
        canvasUtility.fillCanvas(zoomFogContext,'2a2f33');

        // Disable interpolation on zoom canvases
        /*zoomTerrainContext.mozImageSmoothingEnabled = */zoomFogContext.mozImageSmoothingEnabled = false;
        /*zoomTerrainContext.webkitImageSmoothingEnabled = */zoomFogContext.webkitImageSmoothingEnabled = false;
        /*zoomTerrainContext.msImageSmoothingEnabled = */zoomFogContext.msImageSmoothingEnabled = false;
        /*zoomTerrainContext.imageSmoothingEnabled = */zoomFogContext.imageSmoothingEnabled = false;

        // Prevent right-click on high canvases
        jQuery('body').on('contextmenu', '#fullHighCanvas', function(e){ return false; })
            .on('contextmenu', '#zoomHighCanvas', function(e){ return false; });
        var tutorialImage = jQuery(document.getElementById('tutorialImage'));
    
        fullHighCanvas.onselectstart = function() { return false; }; // Disable text selection.
        zoomHighCanvas.onselectstart = function() { return false; };

        $scope.attachObjInfo = function() {
            objectInfoPanel = jQuery(document.getElementById('objectInfo'));
            objectInfoPanel.children('div').mousedown(zoomOnMouseDown).mousemove(zoomOnMouseMove)
                .mouseleave(zoomOnMouseOut).mousewheel(zoomScroll);
        };
        $scope.attachControls = function() { // Define controls when controls partial is loaded
            controlsDIV = jQuery('#controls');
            progressBar = controlsDIV.children('.progress').children('.progress-bar');
            jQuery('body').on('contextmenu', '#controls', function(e){ return false; })
                .on('contextmenu', '.progress-bar', function(e){ return false; });
            controlsDIV.mousedown(zoomOnMouseDown).mousemove(zoomOnMouseMove)
                .mouseleave(zoomOnMouseOut).mousewheel(zoomScroll);
        };
        // Reset player
        $scope.reset = function() {
            fireUser.once('value',function(snap) {
                var cleaned = snap.val(); 
                cleaned.camp = cleaned.movement = cleaned.visiblePixels = cleaned.autoEat = cleaned.money =
                    cleaned.visitedCamps = cleaned.inventory = cleaned.skills = cleaned.stats = null;
                cleaned.new = true; fireUser.set(cleaned);
            });
        };
        $scope.countTo = function(n) { 
            var counted = []; for(var i = 0; i < n; i++) { counted.push(+i+1); } return counted; };
        $scope.isNumber = function(input) { return parseInt(input) === input; };
        $scope.restrictNumber = function(input,dec) {
            input = input.replace(/[^\d.-]/g, '').replace('..','.').replace('..','.').replace('-','');
            return input;
        };
        $scope.refresh = function() { drawZoomCanvas(); }; // Redraw zoom canvas
        $scope.changeZoom = function(val) {
            $scope.zoomLevel = parseInt(val);
            var oldZoom = zoomSize;
            localStorage.set('zoomLevel',$scope.zoomLevel);
            zoomPixSize = zoomLevels[$scope.zoomLevel];
            zoomSize = [900/zoomPixSize,600/zoomPixSize];
            var offset = [oldZoom[0]-zoomSize[0],oldZoom[1]-zoomSize[1]];
            if(!viewCenter) {
                viewCenter = [$scope.zoomPosition[0] + zoomSize[0]/2,
                    $scope.zoomPosition[1] + zoomSize[1]/2];
                lastZoomPosition = $scope.zoomPosition;
            } else {
                var fixedCoords = [Math.floor(viewCenter[0]-oldZoom[0]/2),Math.floor(viewCenter[1]-oldZoom[1]/2)];
                lastZoomPosition = [Math.floor(fixedCoords[0]+offset[0]/2), // Keep centered
                    Math.floor(fixedCoords[1]+offset[1]/2)];
            }
            var x = lastZoomPosition[0], y = lastZoomPosition[1]; // Fix zoom area going off edge
            if(x < 0) { x = 0; } if(y < 0) { y = 0; }
            x = Math.min(300 - zoomSize[0],Math.max(x,0)); y = Math.min(300 - zoomSize[1],Math.max(y,0));
            $scope.zoomPosition = lastZoomPosition = [x,y];
            localStorage.set('zoomPosition',$scope.zoomPosition);
            canvasUtility.fillCanvas(fullHighContext,'erase'); // Draw new zoom highlight area
            canvasUtility.fillMainArea(fullHighContext,'rgba(255, 255, 255, 0.06)',
                lastZoomPosition,zoomSize);
            drawZoomCanvas(); dimPixel();
        };
        // Grab a specific item from user's inventory (find by property(s), like name or type)
        $scope.hasItem = function(checkObject) {
            for(var invKey in $scope.inventory) { if(!$scope.inventory.hasOwnProperty(invKey)) { continue; }
                var passed = true;
                for(var checkKey in checkObject) { if(!checkObject.hasOwnProperty(checkKey)) { continue; }
                    if($scope.inventory[invKey][checkKey] != checkObject[checkKey]) { passed = false; }
                }
                if(passed) { return $scope.inventory[invKey]; }
            }
            return false;
        };
        // Count items in user's inventory that match criteria
        $scope.countItems = function(checkObject) {
            var qualified = [];
            for(var invKey in $scope.inventory) { if(!$scope.inventory.hasOwnProperty(invKey)) { continue; }
                for(var checkKey in checkObject) { if(!checkObject.hasOwnProperty(checkKey)) { continue; }
                    if($scope.inventory[invKey][checkKey] == checkObject[checkKey]) { 
                        qualified.push($scope.inventory[invKey][checkKey]) }
                }
            }
            return qualified;
        };
        $scope.toggleItemType = function(type) {
            $scope.showItemTypes[type] = !$scope.showItemTypes[type];
            localStorage.set('showItemTypes',$scope.showItemTypes);
        };
        $scope.changeUIOption = function(option,value) { // Modify a persistent UI option
            $scope.uiOptions[option] = value;
            localStorage.set('uiOptions',$scope.uiOptions);
        };
        // Create player camp, newbie's first step
        $scope.createCamp = function() {
            tutorial('next'); $scope.user.new = false; fireUser.child('new').set(false);
            fireServer.push({ user: userID, action: 'createCamp' });
        };
        // Adding an object to the canvas
        $scope.addObject = function(object) {
            object.adding = true; $scope.placingObject = object;
            jQuery(zoomHighCanvas).unbind('mousedown').mousedown(placeObject);
        };
        $scope.cancelAddObject = function() {
            $timeout(function() { dimPixel(); $scope.placingObject.adding = false; $scope.placingObject = {};
                jQuery(zoomHighCanvas).unbind('mousedown').mousedown(zoomOnMouseDown);
            });
        };
        $scope.updateSkips = function() {
            $scope.tutorialSkips.push($scope.event.type);
            localStorage.set('tutorialSkips',$scope.tutorialSkips);
            $timeout(function() { $scope.inEventTutorial = false; });
            tutorialImage.unbind('mousedown');
            actCanvasUtility.eventHighCanvas.on('mousedown',eventOnClick);
            var skills = $scope.user.skills ? $scope.user.skills : {};
            gameUtility.setupActivity($scope.event.type,skills[$scope.event.type]);
        };
        $scope.doActivity = function(actIndex) {
            // TODO: Move event stuff into gameUtility so events can end without clicks
            if(!$scope.onPixel.activities || actIndex > $scope.onPixel.activities.length - 1 
                || $scope.onPixel.activities[actIndex].abundance < 0.006) { return; }
            $timeout(function() {
                var object = $scope.onPixel.activities[actIndex];
                $scope.event = { type: object.type, abundance: object.abundance }; // Get event type and abundance
                var abundance = abundances.hasOwnProperty(object.type) ? abundances[object.type].amount : 0;
                fireRef.child('abundances/'+$scope.user.location+'/'+object.type).set({
                    time: abundances[object.type] ? abundances[object.type].time : Firebase.ServerValue.TIMESTAMP,
                    amount:abundance-1});
                $scope.inEvent = true;
                $scope.inEventTutorial = jQuery.inArray($scope.event.type,$scope.tutorialSkips) < 0; // Skip tut?
                var skills = $scope.user.skills ? $scope.user.skills : {};
                if($scope.inEventTutorial) {
                    tutorialImage.on('mousedown',function() {
                        $timeout(function() { $scope.inEventTutorial = false; });
                        tutorialImage.unbind('mousedown');
                        setTimeout(function(){actCanvasUtility.eventHighCanvas.on('mousedown',eventOnClick);},300);
                        $scope.event.result = {
                            energy: gameUtility.setupActivity($scope.event,skills[$scope.event.type]) };
                    });
                } else {
                    setTimeout(function(){actCanvasUtility.eventHighCanvas.on('mousedown',eventOnClick);},300);
                    $scope.event.result = { 
                        energy: gameUtility.setupActivity($scope.event,skills[$scope.event.type]) };
                }
            });
        };
        $scope.takeFromEvent = function(product) {
            var taking;
            if(product == 'all') { taking = $scope.event.products; $scope.event.products = []; } 
                else { taking = [$scope.event.products[product]]; $scope.event.products.splice(product,1); }
            gameUtility.addToInventory(taking);
            if($scope.event.products.length == 0 && $scope.event.result.ended) {
                actCanvasUtility.eventHighCanvas.unbind('mousedown');
                $timeout(function() { $scope.inEvent = false; $scope.event = {}; });
            }
        };
        $scope.autoEat = function(food,eatThis) {
            var key = food.status == 'cooked' ? food.name + ':cooked' : food.name;
            if(eatThis) {
                if($scope.user.hasOwnProperty('autoEat')) {
                    $scope.user.autoEat.push(key);
                } else { $scope.user.autoEat = [key] }
                gameUtility.changeHunger(userID,0);
            } else { $scope.user.autoEat.splice(jQuery.inArray(key,$scope.user.autoEat),1); }
            if($scope.user.autoEat.length == 0) { // Send to firebase
                fireUser.child('autoEat').remove(); } else { fireUser.child('autoEat').set($scope.user.autoEat); }
        };
        $scope.movePlayer = function(dir) {
            if(dir == 'startStop') { // If starting or stopping movement
                if($scope.moving) { fireServer.push({ user: userID, action: 'stop' });
                    $scope.moving = false; dimPixel(); return; } 
                $scope.moving = true; dimPixel();
                var moveTime = 5 * (1 + localTerrain[$scope.movePath[0]] / 60);
                playWaitingBar(moveTime+0.5);
                fireServer.push({ user: userID, action: 'move', path: $scope.movePath }); return;
            }
            if(dir == 'clear') { $timeout(function(){ $scope.movePath = []; dimPixel(); }); return; }
            if(dir == 'undo') { $timeout(function(){ $scope.movePath.pop(); dimPixel(); }); return; }
            // If new path, use player location, otherwise use last path node
            var destination = $scope.movePath.length == 0 ? [parseInt($scope.user.location.split(':')[0]),
                parseInt($scope.user.location.split(':')[1])] : 
                [parseInt($scope.movePath[$scope.movePath.length-1].split(':')[0]),
                    parseInt($scope.movePath[$scope.movePath.length-1].split(':')[1])];
            switch(dir) { // Apply move direction
                case 0: destination[1] = (destination[1] - 1); break;
                case 1: destination[0] = (destination[0] - 1); break;
                case 2: destination[0] = (destination[0] + 1); break;
                case 3: destination[1] = (destination[1] + 1); break;
            }
            var destGrid = destination.join(':');
            var lastGrid = $scope.movePath.length > 1 ? 
                $scope.movePath[$scope.movePath.length-2] : $scope.user.location; // Backtracking erases path
            if(destGrid == lastGrid) { $timeout(function(){ $scope.movePath.pop(); dimPixel(); }); return; } 
            // Don't allow pathing into known water
            if(visiblePixels.hasOwnProperty(destGrid) && !localTerrain.hasOwnProperty(destGrid)) { return; }
            $timeout(function(){ $scope.movePath.push(destGrid); dimPixel(); });
        };
        $scope.lookAround = function() { // Further examine current grid (as if re-moving to this grid)
            if($scope.cantLook) { return; } $scope.lookCount++;
            $scope.looking = true;
            var look = function() {
                if($scope.onPixel.camp) {
                    // If there is a camp here
                } else {
                    // If there is not a camp here
                }
                $scope.looking = false;
                if($scope.lookCount > 2) { $scope.cantLook = true; }
            };
            $timeout(function(){});
            setTimeout(look,1500); playWaitingBar(1.5); // Look around for 1.5 seconds
            gameUtility.changeHunger(userID,2); // Use 2 hunger
        };
        $scope.buildCampfire = function() { // Build a campfire on this pixel
            if($scope.onPixel.camp) { return; }
            $timeout(function(){ $scope.looking = true; });
            var campfireReady = function() {
                //fireUser.child('movement/campfires/'+$scope.user.location).set(new Date().getTime());
                $timeout(function(){ $scope.looking = false; $scope.onPixel.campfire = true; });
            };
            var buildTime = Math.ceil(Math.random()*2 + (1-$scope.onPixel.forest)*8); // 2 to 4 seconds
            setTimeout(campfireReady,buildTime*1000); playWaitingBar(buildTime);
            gameUtility.changeHunger(userID,3); // Use 3 hunger
        };
        $scope.changeBrush = function(val) {
            $timeout(function(){  $scope.brushSize = val; $scope.lockElevation = $scope.lockElevation || val > 0; });
        };
        $scope.addLabel = function(text) { $scope.labelText = text; addingLabel = true; };
        $scope.saveTerrain = function() { // Save terrain to firebase, notify clients to update terrain
            $timeout(function() {
                $scope.eventLog.unshift({ time: new Date().getTime(), user: 'You', type: 'updated the terrain' }); });
            fireRef.child('terrain').update(updatedTerrain, function() {
                updatedTerrain = {}; // Clear updated terrain object
                $scope.lastTerrainUpdate = new Date().getTime();
                fireRef.child('lastTerrainUpdate').set({user: userID, time:$scope.lastTerrainUpdate});
            });
        };
        $scope.changeStall = function(stallID,index) {
            gameUtility.marketMessage.clear();
            var stall = jQuery(document.getElementById('selectedStall')).finish(), 
                market = $scope.onPixel.camp.economy.market;
            var checkNewStall = function() {
                if(!market.selectedStall.hasOwnProperty('goods')) { // If new, empty stall
                    Math.seedrandom(stallID);
                    market.stalls[stallID] = { id: stallID, type: 'user', canvas: $scope.user.camp.color, goods: {},
                        goodCount: 0, categoryCount: 0, markup: 1, bg: colorUtility.generate('stallBG').hex };
                    market.selectedStall = market.stalls[stallID];
                    gameUtility.marketMessage.set('Choose goods from your inventory to <b>sell</b>. Check other' +
                        ' stalls in the market to ensure your prices are <b>competitive</b>.' +
                        ' Goods you add to your stall will be <b>immediately ' +
                        'available for sale</b>.','');
                }
            };
            if(market.hasOwnProperty('selectedStall')) {
                if(market.selectedStall.id == stallID) {
                    stall.animate({'opacity':0},200)
                        .children('.stall-content').animate({'height':'1px'},200,function() {
                            delete market.selectedStall.rightSide; delete market.selectedStall;
                            if(market.stalls['su'+userID] && 
                                !market.stalls['su'+userID].hasOwnProperty('categories')) {
                                delete market.stalls['su'+userID];
                            }
                            $timeout(function(){});
                        });
                } else {
                    var keptSide = market.selectedStall.rightSide;
                    delete market.selectedStall.rightSide;
                    var offset = market.selectedStall.id > stallID ? '22px' : '-22px';
                    market.selectedStall = market.stalls[stallID] || {}; market.selectedStall.id = stallID;
                    if(keptSide) { market.selectedStall.rightSide = keptSide; }
                    stall.children('.canvas').animate({'background-position-x':offset},300,
                        function(){ jQuery(this).css({'background-position-x':0}); });
                    checkNewStall();
                }
            } else {
                market.selectedStall = market.stalls[stallID] || {};
                market.selectedStall.id = stallID;
                index = index == -1 ? market.stallCount : index; // User stall is last
                if(jQuery.inArray(index,[2,3,6,7,10,11,14,15,18,19]) >= 0) {
                    market.selectedStall.rightSide = true; }
                stall.animate({'opacity':1},200).children('.stall-content').animate({'height':'206px'},300);
                checkNewStall();
            }
            if(market.selectedStall.markup < 1.4 && market.selectedStall.id.substr(0,2) != 'su') {
                gameUtility.marketMessage.add('All our goods are <b>on sale</b> today!','promotion'); }
            if(market.selectedStall.exoticGood) { 
                gameUtility.marketMessage.add('Today we have a <b>rare item</b> for sale! It\'s a <b>' +
                    market.selectedStall.exoticGood.split(':')[0]+'</b> from the '+
                    market.selectedStall.exoticGood.split(':')[1]+'!','promotion'); }
        };
        $scope.changeGood = function(goodID,index) {
            var good = $scope.onPixel.camp.economy.market.selectedStall.id == 'su'+userID ? 
                    jQuery(document.getElementById('newGood')).finish() : 
                    jQuery(document.getElementById('selectedGood')).finish(),
                market = $scope.onPixel.camp.economy.market;
            var checkNewGood = function() {
                if(!market.selectedStall.selectedGood.hasOwnProperty('name')) {
                    market.selectedStall.goods[goodID] = { id: goodID, invKey: 'none' };
                    market.selectedStall.selectedGood = market.selectedStall.goods[goodID];
                } else if(market.selectedStall.id == 'su'+userID) {
                    market.selectedStall.selectedGood = market.selectedStall.goods['newGood'] = { 
                        editing: true, key: market.selectedStall.selectedGood.key,
                        invItem: $scope.onPixel.camp.economy.market.inventory[market.selectedStall.selectedGood.key],
                        addAmount: market.selectedStall.selectedGood.amount,
                        addPrice: market.selectedStall.selectedGood.value, 
                        prevGood: market.selectedStall.selectedGood.prevGood,
                        prevAmount: market.selectedStall.selectedGood.prevAmount,
                        id: 'newGood', invKey: market.selectedStall.selectedGood.key };
                }
            };
            if(market.selectedStall.hasOwnProperty('selectedGood') && 
                market.selectedStall.selectedGood.id != 'newGood') {
                if(market.selectedStall.selectedGood.id == goodID) {
                    good.animate({'opacity':0,'height':'1px'},100,function() {
                        delete market.selectedStall.selectedGood.rightSide; delete market.selectedStall.selectedGood;
                        $timeout(function(){});
                    });
                } else {
                    var keptSide = market.selectedStall.selectedGood.rightSide;
                    delete market.selectedStall.selectedGood.rightSide;
                    market.selectedStall.selectedGood = market.selectedStall.goods[goodID] || {};
                    market.selectedStall.selectedGood.id = goodID;
                    if(keptSide) { market.selectedStall.selectedGood.rightSide = keptSide; }
                    checkNewGood();
                }
            } else {
                market.selectedStall.selectedGood = market.selectedStall.goods[goodID] || {};
                market.selectedStall.selectedGood.id = goodID;
                index = index == -1 ? market.selectedStall.goodCount : index; // New good is last
                if(jQuery.inArray(index,[2,3,6,7]) >= 0) { market.selectedStall.selectedGood.rightSide = true; }
                good.animate({'opacity':1,'height':'184px'},150);
                checkNewGood();
            }
            if(market.selectedStall.hasOwnProperty('selectedGood')) {
                var buyAmount = market.selectedStall.selectedGood.buyAmount;
                market.selectedStall.selectedGood.buyAmount = buyAmount ? buyAmount : 1;
            }
        };
        $scope.changeRefGood = function(goodID,refineType) {
            var refGood = jQuery(document.getElementById(refineType+'selectedRefGood')).finish(),
                refinery = $scope.onPixel.camp.economy[refineType];
            if(refinery.hasOwnProperty('selectedRefGood')) {
                if(refinery.selectedRefGood.id == goodID) {
                    refGood.animate({'opacity':0,'height':'1px'},100,function() {
                        delete refinery.selectedRefGood;
                        $timeout(function(){});
                    });
                } else {
                    refinery.selectedRefGood = $scope.inventory[goodID]; refinery.selectedRefGood.id = goodID; }
            } else {
                refinery.selectedRefGood = $scope.inventory[goodID]; refinery.selectedRefGood.id = goodID;
                refGood.animate({'opacity':1,'height':'184px'},150);
            }
            if(refinery.hasOwnProperty('selectedRefGood')) {
                var sellAmount = refinery.selectedRefGood.sellAmount;
                var refineAmount = refinery.selectedRefGood.refineAmount;
                refinery.selectedRefGood.sellAmount = sellAmount ? sellAmount : $scope.inventory[goodID].amount;
                refinery.selectedRefGood.refineAmount = 
                    refineAmount ? refineAmount : $scope.inventory[goodID].amount;
            }
        };
        $scope.addGoodToStall = function() {
            gameUtility.marketMessage.clear();
            var theStall = $scope.onPixel.camp.economy.market.selectedStall;
            var theItem = theStall.selectedGood.invItem;
            var status = theItem.status ? ':' + theItem.status : '';
            var catName = jQuery.inArray(theItem.status,['meat','pelt']) < 0 ? theItem.type == 'other' ? theItem.name :
                theItem.type : theItem.status;
            if(theStall.selectedGood.editing) {
                if(theStall.goods.hasOwnProperty(theItem.key)) { // Good type didn't change
                    fireInventory.child(theItem.key).transaction(function(invAmount) {
                        if(invAmount) { return +invAmount + +theStall.selectedGood.prevAmount - 
                            theStall.selectedGood.addAmount == 0 ? null :
                            +invAmount + +theStall.selectedGood.prevAmount - theStall.selectedGood.addAmount;
                        } else { return theStall.selectedGood.prevAmount - theStall.selectedGood.addAmount == 0 ?
                            null : theStall.selectedGood.prevAmount - theStall.selectedGood.addAmount; }
                    });
                } else { // Good type changed, delete old good
                    var prevCatName = jQuery.inArray(theStall.selectedGood.prevGood.status,['meat','pelt']) < 0 ?
                        theStall.selectedGood.prevGood.type == 'other' ? theStall.selectedGood.prevGood.name :
                            theStall.selectedGood.prevGood.type : theStall.selectedGood.prevGood.status;
                    theStall.categories[prevCatName][0] -= 
                        theStall.goods[theStall.selectedGood.prevGood.key].amount;
                    theStall.categories[prevCatName].splice(
                        jQuery.inArray(theStall.selectedGood.prevGood.key,theStall.categories[prevCatName]),1);
                    delete theStall.goods[theStall.selectedGood.prevGood.key];
                    if(theStall.categories[prevCatName][0] < 1) { delete theStall.categories[prevCatName]; }
                    fireRef.child('camps/list/'+$scope.onPixel.camp.grid+'/userStalls/su'+userID+'/'+
                        theStall.selectedGood.prevGood.key).set(null);
                    fireInventory.child(theStall.selectedGood.prevGood.key).transaction(function(invAmount) {
                        return +invAmount + +theStall.selectedGood.prevAmount || 
                            theStall.selectedGood.prevAmount; });
                    fireInventory.child(theItem.key).transaction(function(invAmount) {
                        return invAmount-theStall.selectedGood.addAmount == 0 ? null :
                            invAmount-theStall.selectedGood.addAmount; });
                }
            } else { // New good, not editing existing
                fireInventory.child(theItem.type+':'+theItem.name+status).transaction(function(invAmount) {
                    return invAmount-theStall.selectedGood.addAmount == 0 ? null : 
                        invAmount-theStall.selectedGood.addAmount; });
            }
            if(theStall.hasOwnProperty('categories')) {
                if(theStall.categories.hasOwnProperty(catName)) {
                    theStall.categories[catName][0] += theStall.selectedGood.addAmount;
                    theStall.categories[catName].push(theItem.name+status);
                } else {
                    if(theStall.categoryCount > 5) {
                        gameUtility.marketMessage.set('Your stall <b>cannot have more than 6 categories' +
                            '</b> of items.','error'); return; }
                    theStall.categories[catName] = [theStall.selectedGood.addAmount,theItem.name+status];
                }
            } else {
                theStall.categories = {};
                theStall.categories[catName] = [theStall.selectedGood.addAmount,theItem.name+status];
            }
            theStall.goods[theItem.key] = { color: theItem.color, type: theItem.type, name: theItem.name, 
                weight: theItem.weight, value: theStall.selectedGood.addPrice, amount: theStall.selectedGood.addAmount,
                status: theItem.status, key: theItem.key, exotic: 1, prevGood: angular.copy(theItem), 
                prevAmount: theStall.selectedGood.addAmount };
            theStall.categoryCount = gameUtility.countProperties(theStall.categories);
            theStall.goodCount = gameUtility.countProperties(theStall.goods);
            if(theStall.goodCount > 8) { delete theStall.selectedGood; } else {
                theStall.selectedGood = theStall.goods['newGood'] = { id: 'newGood', invKey: 'none' }; }
            fireRef.child('camps/list/'+$scope.onPixel.camp.grid+'/userStalls/su'+userID+'/'+theItem.key).set(
                { amount: parseInt(theStall.goods[theItem.key].amount), value: theStall.goods[theItem.key].value }
            );
        };
        $scope.deleteGoodFromStall = function() {
            var theStall = $scope.onPixel.camp.economy.market.selectedStall;
            var prevGood = theStall.selectedGood.prevGood;
            var prevCatName = jQuery.inArray(prevGood.status,['meat','pelt']) < 0 ?
                theStall.selectedGood.prevGood.type == 'other' ? prevGood.name :
                    prevGood.type : prevGood.status;
            var status = prevGood.status ? ':'+prevGood.status : '';
            fireInventory.child(prevGood.type+':'+prevGood.name+status).transaction(function(invAmount) {
                return invAmount ? +invAmount + +theStall.selectedGood.prevAmount : +theStall.selectedGood.prevAmount; });
            theStall.categories[prevCatName][0] -= theStall.goods[prevGood.key].amount;
            theStall.categories[prevCatName].splice(
                jQuery.inArray(prevGood.key,theStall.categories[prevCatName]),1);
            if(theStall.categories[prevCatName][0] < 1) { delete theStall.categories[prevCatName]; }
            fireRef.child('camps/list/'+$scope.onPixel.camp.grid+'/userStalls/su'+userID+'/'+
                prevGood.key).set(null);
            delete theStall.goods[prevGood.key]; delete theStall.selectedGood;
        };
        $scope.buyGood = function() {
            var stall = $scope.onPixel.camp.economy.market.selectedStall,
                good = stall.selectedGood, amount = +stall.selectedGood.buyAmount;
            if(amount < 1 || amount > good.amount || !parseInt(amount)) { return; }
            if($scope.user.money - Math.round(amount * good.value * stall.markup) < 0) { return; }
            console.log('buying',amount,good.name,'at', good.value * stall.markup,'gold per unit');
            var status = good.status ? ':' + good.status : '';
            fireInventory.child(good.type+':'+good.name+status).transaction(function(invAmount) {
                return invAmount ? +invAmount + +amount : +amount; });
            var stockPath = stall.id.substr(0,2) == 'su' ? 
                '/userStalls/'+stall.id+'/'+good.key+'/amount' : '/stock/'+stall.id+'/goods/'+good.key;
            if(stall.id.substr(0,2) == 'su') { // If this is a user stall, pay the man
                fireRef.child('users/'+stall.id.substring(2,stall.id.length)+'/money').transaction(function(money) {
                    return Math.round(parseInt(money) + amount * good.value * stall.markup) ||
                        Math.round(amount * good.value * stall.markup); });
                if(good.amount-amount == 0) { // If user stall stock is depleted
                    fireRef.child('camps/list/'+$scope.onPixel.camp.grid+'/userStalls/'+
                        stall.id+'/'+good.key).set(null);
                } else { fireRef.child('camps/list/'+$scope.onPixel.camp.grid+stockPath).set(good.amount-amount); }
            } else { fireRef.child('camps/list/'+$scope.onPixel.camp.grid+stockPath).set(good.amount-amount); }
            $scope.user.money = Math.round($scope.user.money - Math.round(amount * good.value * stall.markup));
            fireUser.child('money').set($scope.user.money);
        };
        $scope.sellItem = function(item,amount,value,refinery) {
            if(amount < 1 || amount > item.amount || !parseInt(amount)) { return; }
            amount = parseInt(amount);
            console.log('selling',amount,item.name,'at',value,'gold per unit');
            var status = item.status ? ':' + item.status : '';
            if(item.amount - amount > 0) {
                if($scope.onPixel.camp.economy[refinery].selectedRefGood) {
                    item.amount -= amount; item.refineAmount = item = item.amount; }
            } else {
                if($scope.onPixel.camp.economy[refinery].selectedRefGood) {
                    delete $scope.onPixel.camp.economy[refinery].selectedRefGood; }
            }
            fireInventory.child(item.type+':'+item.name+status).transaction(function(invAmount) {
                return invAmount-amount == 0 ? null : invAmount-amount; });
            $scope.user.money = Math.round($scope.user.money + amount * value); 
            fireUser.child('money').set($scope.user.money);
        };
        $scope.refineItem = function(item,amount,cost,refineType) {
            if(amount < 1 || amount > item.amount || !parseInt(amount)) { return; }
            amount = parseInt(amount);
            if(Math.round($scope.user.money - amount * cost) < 0) { return; }
            console.log('refining',amount,item.name,'at',cost,'gold per unit');
            var status = item.status ? ':' + item.status : '';
            if(item.amount - amount > 0) {
                if($scope.onPixel.camp.economy[refineType].selectedRefGood) {
                    item.amount -= amount; item.refineAmount = item.sellAmount = item.amount; }
            } else {
                if($scope.onPixel.camp.economy[refineType].selectedRefGood) {
                    delete $scope.onPixel.camp.economy[refineType].selectedRefGood; }
            }
            fireInventory.child(item.type+':'+item.name+status).transaction(function(invAmount) {
                return invAmount-amount == 0 ? null : invAmount-amount; });
            $scope.user.money = Math.round($scope.user.money - amount * cost);
            fireUser.child('money').set($scope.user.money);
            fireUser.child('camps/'+$scope.onPixel.camp.grid+'/refining/'+refineType).transaction(function(refAmount) {
                return +refAmount+1 || amount; }); // Add or set refine amount
            var uniqueID = fireRef.push().name(); uniqueID = uniqueID.substr(uniqueID.length - 6,5);
            fireRef.child('camps/list/'+$scope.onPixel.camp.grid+'/refining/'+refineType+'/'+userID+':-:'+item.type+':'+
                item.name+status+':-:'+amount+':-:'+uniqueID).set(Firebase.ServerValue.TIMESTAMP);
        };
        $scope.claimRefined = function(refined,refineType) {
            var status = refined.status ? ':' + refined.status : '';
            fireInventory.child(refined.type+':'+refined.name+status).transaction(function(invAmount) {
                return invAmount ? +invAmount + +refined.amount : refined.amount; });
            fireRef.child('camps/list/'+$scope.onPixel.camp.grid+'/refined/'+refineType+'/'+refined.key).remove();
            fireUser.child('camps/'+$scope.onPixel.camp.grid+'/refining/'+refineType).transaction(function(refAmount) {
                return refAmount-1 == 0 ? null : refAmount-1; }); // Subtract/set refine amt
        };
        $scope.cookFood = function(item,amount) {
            if(amount < 1 || amount > item.amount) { return; }
            console.log('cooking',amount,item.name);
            fireInventory.child(item.type+':'+item.name+':cooked').transaction(function(invAmount) {
                return invAmount ? +invAmount + +amount : +amount; });
            var status = item.status ? ':' + item.status : '';
            fireInventory.child(item.type+':'+item.name+status).transaction(function(invAmount) {
                return invAmount - amount < 1 ? null : invAmount - amount; });
            gameUtility.changeHunger(userID,0);
        };
        $scope.cookAll = function() {
            for(var coKey in $scope.inventory) {
                if(!$scope.inventory.hasOwnProperty(coKey) || $scope.inventory[coKey].status == 'cooked') { continue; }
                if(gameUtility.edibles.hasOwnProperty($scope.inventory[coKey].name)) {
                    if(gameUtility.edibles[$scope.inventory[coKey].name].hasOwnProperty('cookedEnergy')) {
                        $scope.cookFood($scope.inventory[coKey],$scope.inventory[coKey].amount);
                    }
                }
                if(gameUtility.edibles.hasOwnProperty($scope.inventory[coKey].type)) {
                    if(gameUtility.edibles[$scope.inventory[coKey].type].hasOwnProperty('cookedEnergy')) {
                        $scope.cookFood($scope.inventory[coKey],$scope.inventory[coKey].amount);
                    }
                }
            }
        };
        var createActivities = function() {
            var activities = gameUtility.getActivityAbundance($scope.user.location,campList);
            for(var actKey in activities) { if(!activities.hasOwnProperty(actKey)) { return; }
                var abundance = abundances.hasOwnProperty(actKey) ? abundances[actKey].amount : 0;
                if(jQuery.inArray(actKey,availableActivities) < 0) { // Activity not already present
                    var newActivity = { type: actKey,
                        abundance: Math.max(0,activities[actKey]+abundance*0.25), 
                        maxAbundance: Math.max(0,activities[actKey]) };
                    if($scope.onPixel.activities) {
                        $scope.onPixel.activities.push(newActivity); availableActivities.push(actKey);
                    } else { $scope.onPixel.activities = [newActivity]; availableActivities = [actKey]; }
                } else { // Activity already present
                    var activity;
                    for(var i = 0; i < $scope.onPixel.activities.length; i++) {
                        if($scope.onPixel.activities[i].type == actKey) {
                            activity = $scope.onPixel.activities[i]; break; }}
                    activity.abundance = activity.maxAbundance + abundance*0.25;
                }
            }
            $timeout(function(){});
        };
        // Clicking in event canvas
        var eventOnClick = function(e) {
            if(e.which == 2 || e.which == 3) { e.preventDefault(); return; } // If right/middle click pressed
            var offset = actCanvasUtility.eventHighCanvas.offset(); // Get pixel location
            var click = { x: Math.floor(e.pageX - offset.left), y: Math.floor(e.pageY - offset.top) };
            var skills = $scope.user.skills ? $scope.user.skills : {};
            $scope.event.result = gameUtility.playActivity($scope.event.type,click,skills[$scope.event.type]);
            $timeout(function() {
                if($scope.event.result.success) {
                    $scope.user.skills = $scope.user.skills ? $scope.user.skills : {};
                    if($scope.user.skills.hasOwnProperty($scope.event.type)) {
                        $scope.user.skills[$scope.event.type] += 1;
                    } else { $scope.user.skills[$scope.event.type] = 1; }
                    fireUser.child('skills').set($scope.user.skills);
                } 
                if($scope.event.result.ended) { // Event finished
                    gameUtility.changeHunger(userID,3); // Use 3 hunger
                    $scope.event.result.energy = null;
                    $scope.event.ended = true;
                    $timeout(function() {
                        if(!$scope.event.ended) { return; }
                        $scope.inEvent = false; $scope.event.message = null;
                        if($scope.event.hasOwnProperty('result')) { $scope.event.result.energy = null; }
                    },2500);
                    actCanvasUtility.eventHighCanvas.unbind('mousedown');
                }
                $scope.event.message = $scope.event.result.message;
                $scope.event.products = $scope.event.products ? 
                    $scope.event.products.concat($scope.event.result.products) : $scope.event.result.products;
            });
        };
        // Animate progress bar above move controls for x seconds
        var playWaitingBar = function(seconds) {
            clearInterval(waitTimer);
            var increments = 1;
            progressBar.css({'-webkit-transition': 'width 0s', 'transition': 'width 0s' });
            $timeout(function() {
                $scope.waitProgress = 0;
                $timeout(function() {
                    progressBar.css({'-webkit-transition': 'width 0.5s linear', 'transition': 'width 0.5s linear' });
                    $scope.waitProgress = Math.floor((increments/2 / seconds) * 100);
                },100);
            });
            waitTimer = setInterval(function() {
                increments++;
                $timeout(function() { 
                    $scope.waitProgress = Math.floor((increments/2 / seconds) * 100);
                    $scope.waitProgress = Math.min($scope.waitProgress,100);
                    if(increments/2 > seconds) { clearInterval(waitTimer); }
                });
            },500)
        };

        var checkEdibles = function() { // Does the user have anything to auto-eat?
            $timeout(function(){
                if(!$scope.inventory) {  $scope.noEdibles = true; return; }
                $scope.noEdibles = true;
                for(var key in $scope.inventory) { if(!$scope.inventory.hasOwnProperty(key)) { continue; }
                    if(gameUtility.edibles.hasOwnProperty($scope.inventory[key].name) && 
                        !gameUtility.edibles[$scope.inventory[key].name].hasOwnProperty('effects') ||
                        $scope.inventory[key].status == 'cooked') {
                        $scope.noEdibles = false; if($scope.user.hunger < 100) { gameUtility.changeHunger(userID,0); }
                        return;
                    }
                }
            });
        };
        
        var updateInventory = function(snapshot) {
            var itemAdded = { 
                type: snapshot.name().split(':')[0], name: snapshot.name().split(':')[1], amount: snapshot.val(),
                status: snapshot.name().split(':')[2] };
            itemAdded = gameUtility.dressItem(itemAdded);
            if($scope.onPixel.camp && itemAdded.type == 'resource') {
                $scope.onPixel.camp.economy.resources[itemAdded.name].invItem = itemAdded;
            }
            if(!$scope.inventory) { $scope.inventory = {}; gameUtility.attachInventory($scope.inventory); }
            $scope.inventory[snapshot.name()] = itemAdded;
            checkEdibles();
            $timeout(function(){});
        };

        var removeInventory = function(snapshot) {
            if(!$scope.inventory.hasOwnProperty(snapshot.name())) { return; }
            if($scope.onPixel.camp && $scope.inventory[snapshot.name()].type == 'resource') {
                delete $scope.onPixel.camp.economy.resources[$scope.inventory[snapshot.name()].name].invItem;
            }
            delete $scope.inventory[snapshot.name()];
            var items = 0; // Check how many items are in the inventory
            for(var key in $scope.inventory) { if($scope.inventory.hasOwnProperty(key)) { items++; break; } }
            if(items == 0) { $scope.inventory = null; }
            checkEdibles();
            $timeout(function(){});
        };
        var updateEquipment = function(snap) {
            if(!snap.val()) { return; }
            $scope.user.equipment = snap.val();
            for(var key in $scope.user.equipment) { if(!$scope.user.equipment.hasOwnProperty(key)) { continue; }
                var condition = $scope.user.equipment[key];
                $scope.user.equipment[key] = gameUtility.equipment[key];
                $scope.user.equipment[key].condition = condition;
                $scope.user.equipment[key].name = key;
            }
            if(!$scope.inventory) { return; }
            for(var invKey in $scope.inventory) { if(!$scope.inventory.hasOwnProperty(invKey)) { continue; }
                $scope.inventory[invKey].actions = gameUtility.getItemActions($scope.inventory[invKey]);
            }
        };
        // Selecting an object on the map
        var selectGrid = function(e) {
            if(e.which == 3) {  e.preventDefault(); return; } // If right click pressed
            if(e.which == 2) {  startDragPanning(e); return; } // If middle click pressed
            if($scope.authStatus != 'logged') { return; } // If not authed
            $timeout(function(){
                if(localObjects.hasOwnProperty($scope.overPixel.x + ':' + $scope.overPixel.y)) {
                    var grid = $scope.overPixel.x + ':' + $scope.overPixel.y;
                    $scope.selectedGrid = localObjects[$scope.overPixel.x + ':' + $scope.overPixel.y];
                    $scope.selectedGrid.grid = grid;
                    $scope.overPixel.objects = $scope.selectedGrid;
                    if($scope.selectedGrid.camp && jQuery.inArray(grid,$scope.user.visitedCamps) >= 0 ) {
                        var refineAmounts = $scope.selectedGrid.camp.refining;
                        var sellAmount = $scope.selectedGrid.camp.selling;
                        $scope.selectedGrid.camp = gameUtility.expandCamp(grid);
                        $scope.selectedGrid.camp.refining = refineAmounts;
                        $scope.selectedGrid.camp.selling = sellAmount;
                        $scope.selectedGrid.camp.type = 'camp';
                        $scope.selectedGrid.camp.visited = true;
                    }
                } else { $scope.selectedGrid = null; }
                objectInfoPanel.show(); objectInfoPanel.css('visibility', 'hidden'); drawZoomCanvas();
            });
        };
        // Placing an object on the map
        var placeObject = function(event) {
            if($scope.authStatus != 'logged') { return; } // If not authed
            if(event.which == 3) { $scope.cancelAddObject(); event.preventDefault(); return; } // If right click
            if(event.which == 2) { startDragPanning(event); return; } // If middle click
            var object = $scope.placingObject;
            dimPixel(); // Dim the pixel being drawn on
            // Add the object in firebase
            fireRef.child('objects/'+$scope.overPixel.x + ':' + $scope.overPixel.y).set(
                {
                    owner: userID, type: object.type, color: object.color, created: new Date().getTime(),
                    contents: object.contents ? object.contents : [], life: 100, 
                    grid: $scope.overPixel.x + ':' + $scope.overPixel.y
                }
            );
            fireInventory.child(object.type+':'+object.name).remove();
            if(object.type == 'camp') {
                $scope.camp.grid = $scope.overPixel.x + ':' + $scope.overPixel.y;
                fireUser.child('camp').update($scope.camp);
            }
            $scope.placingObject = {};
            jQuery(zoomHighCanvas).unbind('mousedown').mousedown(zoomOnMouseDown);
        };

        var drawZoomCanvas = function() {
            if(!$scope.terrainReady) { return; }
//            zoomTerrainContext.drawImage(fullTerrainCanvas, $scope.zoomPosition[0]*mainPixSize, 
//                $scope.zoomPosition[1]*mainPixSize, 900/zoomPixSize, 600/zoomPixSize, 0, 0, 900, 600);

            canvasUtility.fillCanvas(fullObjectContext,'erase');
            canvasUtility.fillCanvas(zoomObjectContext,'erase');
            for(var labKey in localLabels) {
                if(localLabels.hasOwnProperty(labKey) && visiblePixels.hasOwnProperty(labKey)) {
                    drawLabel(labKey.split(":"),localLabels[labKey]); }
            }
            for(var objKey in localObjects) {
                if(localObjects.hasOwnProperty(objKey) && visiblePixels.hasOwnProperty(objKey)) {
                    drawObject(objKey.split(":"),localObjects[objKey]); }
            }
            $timeout(function(){
                objectInfoPanel.css('visibility', 'visible');
                if($scope.selectedGrid && $scope.selectedGrid.camp) { // Show/hide object info panel
                    var top = ($scope.selectedGrid.grid.split(':')[1] - $scope.zoomPosition[1])
                        * zoomPixSize + zoomPixSize;
                    var left = ($scope.selectedGrid.grid.split(':')[0] - $scope.zoomPosition[0])
                        * zoomPixSize + zoomPixSize;
                    if(top < 0 || left < 0 || left >= 900 || top >= 600) { 
                        objectInfoPanel.css('visibility', 'hidden'); 
                    } else {
                        if(top + objectInfoPanel.children('div').outerHeight() >= 600) {
                            objectInfoPanel.offset({ top: jQuery(zoomHighCanvas).offset().top + top
                                - objectInfoPanel.children('div').outerHeight() - zoomPixSize });
                        } else {
                            objectInfoPanel.offset({ top: jQuery(zoomHighCanvas).offset().top + top });
                        }
                        if(left + objectInfoPanel.children('div').outerWidth() >= 900) {
                            objectInfoPanel.offset({ left: jQuery(zoomHighCanvas).offset().left + left
                                - objectInfoPanel.children('div').outerWidth() - zoomPixSize });
                        } else {
                            objectInfoPanel.offset({ left: jQuery(zoomHighCanvas).offset().left + left });
                        }
                    }
                }
            },1);
            //canvasUtility.drawCamps(zoomObjectContext,nativeCamps,$scope.zoomPosition,zoomPixSize);
//            canvasUtility.drawFog(
//                zoomFogContext,fullTerrainContext,visiblePixels,$scope.zoomPosition,zoomPixSize,localTerrain);
            zoomFogContext.drawImage(fullFogCanvas, $scope.zoomPosition[0]*mainPixSize,
                $scope.zoomPosition[1]*mainPixSize, 900/zoomPixSize, 600/zoomPixSize, 0, 0, 900, 600);
            if($scope.mapElements.overlay != 'none') { canvasUtility.drawOverlay(zoomFogContext,
                $scope.mapElements.overlay,visiblePixels,localTerrain,terrainFeatures,
                $scope.zoomPosition,zoomPixSize); }
            if(!$scope.user || !$scope.user.location) { return; }
            canvasUtility.drawPlayer(fullObjectContext,$scope.user.location.split(':'),0,0);
            canvasUtility.drawPlayer(zoomObjectContext,$scope.user.location.split(':'),
                $scope.zoomPosition,zoomPixSize);
        };
        
        var changeZoomPosition = function(x,y) {
            canvasUtility.fillMainArea(fullHighContext,'erase',lastZoomPosition,zoomSize);
            $scope.zoomPosition = [x,y];
            if(viewCenter){ localStorage.set('zoomPosition',$scope.zoomPosition); }
            lastZoomPosition = [x,y];
            drawZoomCanvas();
            if(viewCenter){ canvasUtility.fillMainArea(fullHighContext,'rgba(255, 255, 255, 0.06)',
                [x,y],zoomSize); } // Draw new zoom rect
            $timeout(function(){});
        };
        // Middle mouse panning on zoomed view
        var startDragPanning = function(e) {
            dragPanning = true; panOrigin = [$scope.overPixel.x,$scope.overPixel.y];
            dimPixel();
            jQuery(zoomHighCanvas).unbind('mousemove').unbind('mousedown')
                .mousemove(dragPan).mouseup(stopDragPanning);
            controlsDIV.unbind('mousemove').unbind('mousedown')
                .mousemove(dragPan).mouseup(stopDragPanning);
            objectInfoPanel.children('div').unbind('mousemove').unbind('mousedown')
                .mousemove(dragPan).mouseup(stopDragPanning);
        };
        var dragPan = function(e) {
            if(!dragPanning || e.which == 0) { stopDragPanning(); return false; }
            var offset = jQuery(zoomHighCanvas).offset(); // Get pixel location
            var x = Math.floor($scope.zoomPosition[0] + (e.pageX - offset.left) / zoomPixSize),
                y = Math.floor($scope.zoomPosition[1] + (e.pageY - offset.top) / zoomPixSize);
            var panOffset = [x - panOrigin[0], y - panOrigin[1]];
            if(panOffset[0] == 0 && panOffset[1] == 0) { return false; }
            var newPosition = [$scope.zoomPosition[0]-panOffset[0],$scope.zoomPosition[1]-panOffset[1]];
            newPosition[0] = Math.min(Math.max(newPosition[0],0),300 - zoomSize[0]);
            newPosition[1] = Math.min(Math.max(newPosition[1],0),300 - zoomSize[1]);
            viewCenter = [newPosition[0]+zoomSize[0]/2,newPosition[1]+zoomSize[1]/2];
            changeZoomPosition(newPosition[0],newPosition[1]); dimPixel(); return false;
        };
        var stopDragPanning = function() {
            dragPanning = false;
            jQuery(zoomHighCanvas).unbind('mousemove').unbind('mousedown').unbind('mouseup')
                .mousemove(zoomOnMouseMove);
            controlsDIV.unbind('mousemove').unbind('mousedown').unbind('mouseup').mousemove(zoomOnMouseMove);
            objectInfoPanel.children('div').unbind('mousemove').unbind('mousedown').unbind('mouseup')
                .mousemove(zoomOnMouseMove);
            if($scope.placingObject.hasOwnProperty('type')) { jQuery(zoomHighCanvas).mousedown(placeObject); }
                else { jQuery(zoomHighCanvas).mousedown(zoomOnMouseDown); }
        };
        // When panning the full view
        var fullViewPan = function(e) {
            var offset = jQuery(fullHighCanvas).offset(); // Get pixel location
            var x = Math.floor((e.pageX - offset.left) / mainPixSize),
                y = Math.floor((e.pageY - offset.top) / mainPixSize);
            viewCenter = [x,y]; // Store view center
            x = Math.floor(x - zoomSize[0]/2); y = Math.floor(y - zoomSize[1]/2); // Apply offsets
            if(x < 0) { x = 0; } if(y < 0) { y = 0; } // Stay in bounds
            if(x > 300 - zoomSize[0]) { x = 300 - zoomSize[0]; }
            if(y > 300 - zoomSize[1]) { y = 300 - zoomSize[1]; }
            if(lastZoomPosition[0] == x && lastZoomPosition[1] == y) { return; }
            changeZoomPosition(x,y); dimPixel();
        };
        // Mouse down on full view
        var panOnMouseDown = function(e) {
            e.preventDefault(); if(dragPanning) { return; } panMouseDown = true; fullViewPan(e); };
        var panOnMouseMove = function(e) { if(!panMouseDown || e.which == 0) { return; } fullViewPan(e); };
        var onMouseUp = function(e) { panMouseDown = dragPanning = false; };
        
        // Clicking in zoomed view
        var zoomOnMouseDown = function(e) {
            e.preventDefault();
            if(panMouseDown || 
                !(e.target.id == 'zoomHighCanvas' || e.target.id == 'controls' || e.target.id == 'objectInfo')) {
                return false; }
            if(e.which == 3 && userID == 1) { // Vegeta can warp on click!
                fireUser.child('movement/location').set($scope.overPixel.x+':'+$scope.overPixel.y); }
            if(e.which == 2 || e.which == 3) { startDragPanning(e); return false; } // If middle/right click pressed
            if(!userID) { return false; } // Ignore actions from non-user
            var x = $scope.overPixel.x, y = $scope.overPixel.y;
            // Make stuff happen when user clicks on map
            if(addingLabel) { fireRef.child('labels/' + x + ':' + y).set($scope.labelText); 
                $scope.labelText = ''; addingLabel = false; return false; }
            // If an object is selected, but is not clicked, clear the selected object
            if($scope.selectedGrid) { if($scope.selectedGrid.grid != x + ':' + y) { 
                $timeout(function() { 
                    $scope.selectedGrid = null; dimPixel(); 
                    delete $scope.overPixel.objects; delete $scope.selectedGrid;
                }); return false; }} else { selectGrid(e); }
            if(!$scope.editTerrain) { return false; } // If terrain hidden or edit mode is off, we're done here
            if(e.which == 3) { // If right clicking (erase)
                for(var i = -1; i < 2; i++) {
                    for(var ii = -1; ii < 2; ii++) {
                        if(localTerrain[(x + i) + ':' + (y + ii)]) { // If something is there to erase
                            updatedTerrain[(x+i) + ':' + (y+ii)] = null;
                            drawTerrain([(x+i),(y+ii)],null);
                        }
                    }
                }
            } else if (e.which == 1) {
                var avgElevation = [0,0];
                for(var j = $scope.brushSize*-1; j < $scope.brushSize+1; j++) {
                    for(var jj = $scope.brushSize*-1; jj < $scope.brushSize+1; jj++) {
                        var localPixel = localTerrain[(x + j) + ':' + (y + jj)];
                        avgElevation[0] += localPixel || 0; avgElevation[1]++;
                        if($scope.smoothTerrain) { continue; }
                        var newElevation = $scope.lockElevation || $scope.brushSize > 0 ? 
                            parseInt($scope.lockedElevation) : localPixel ? localPixel + 1 : 1;
                        var nearElevation = (localTerrain[((x + j) - 1) + ':' + (y + jj)] || newElevation) +
                            (localTerrain[((x + j) + 1) + ':' + (y + jj)] || newElevation) +
                            (localTerrain[(x + j) + ':' + ((y + jj) - 1)] || newElevation) +
                            (localTerrain[(x + j) + ':' + ((y + jj) + 1)] || newElevation);
                        newElevation = localPixel > nearElevation/4 + 4 ? parseInt(nearElevation/4) + 4 : newElevation;
                        newElevation = localPixel < nearElevation/4 - 4 ? parseInt(nearElevation/4) - 4 : newElevation;
                        // Update only if new elevation is different, and grid is in bounds
                        if(localPixel != newElevation && x+j >= 0 && x+j < 300 && y+jj >= 0 && y+jj < 300) {
                            newElevation = newElevation > 0 ? newElevation : null;
                            updatedTerrain[(x+j) + ':' + (y+jj)] = newElevation;
                            localTerrain[(x+j) + ':' + (y+jj)] = newElevation;
                            drawTerrain([(x+j),(y+jj)],newElevation);
                        }
                    }
                }
                if($scope.smoothTerrain) {
                    avgElevation = avgElevation[0] / avgElevation[1];
                    for(var k = $scope.brushSize*-1; k < $scope.brushSize+1; k++) {
                        for(var kk = $scope.brushSize*-1; kk < $scope.brushSize+1; kk++) {
                            localPixel = localTerrain[(x + k) + ':' + (y + kk)] || 0;
                            var weight = ($scope.brushSize+1 - (Math.abs(k)+Math.abs(kk)) / 1.5) / $scope.brushSize;
                            var weightedElevation = Math.round(localPixel + 
                                (avgElevation-localPixel)*(weight/8));
                            if(localPixel != weightedElevation && x+k >= 0 && x+k < 300 && y+kk >= 0 && y+kk < 300) {
                                weightedElevation = weightedElevation > 0 ? weightedElevation : null;
                                updatedTerrain[(x+k) + ':' + (y+kk)] = weightedElevation;
                                localTerrain[(x+k) + ':' + (y+kk)] = weightedElevation;
                                drawTerrain([(x+k),(y+kk)],weightedElevation);
                            }
                        }
                    }
                }
            }
            $timeout(function() {
                $scope.overPixel.type = localTerrain[x + ':' + y] ? 'land' : 'water';
                $scope.overPixel.elevation = localTerrain[x + ':' + y] ? localTerrain[x + ':' + y] : 0;
            });
            return false;
        };
    
        // Check for mouse moving to new pixel
        var zoomOnMouseMove = function(e) {
            var offset = jQuery(zoomHighCanvas).offset(); // Get pixel location
            var x = e.pageX - offset.left < 0 ? 0 : Math.floor((e.pageX - offset.left) / zoomPixSize);
            var y = e.pageY - offset.top < 0 ? 0 : Math.floor((e.pageY - offset.top) / zoomPixSize);
            // If the pixel location has changed
            if($scope.overPixel.x != x + $scope.zoomPosition[0] || 
                $scope.overPixel.y != y + $scope.zoomPosition[1]) {
                zoomHighCanvas.style.cursor = 'default'; // Show cursor
                dimPixel(); // Dim the previous pixel
                $scope.overPixel.x = (x+$scope.zoomPosition[0]); 
                $scope.overPixel.y = (y+$scope.zoomPosition[1]);
                var grid = $scope.overPixel.x+':'+$scope.overPixel.y;
                if(visiblePixels.hasOwnProperty(grid)) { // If grid is visible or explored
                    $scope.overPixel.objects = localObjects[grid];
                    if(jQuery.inArray(grid,campList) >= 0 && $scope.mapElements.objects) { // If there is a camp here
                        Math.seedrandom(grid); var text = 'Camp ' + 
                            gameUtility.capitalize(Chance($scope.overPixel.x*1000 + $scope.overPixel.y).word());
                        canvasUtility.drawLabel(zoomHighContext,[$scope.overPixel.x-$scope.zoomPosition[0],
                            $scope.overPixel.y-$scope.zoomPosition[1]],text,zoomPixSize);
                    } else if($scope.user.location == grid) {
                        canvasUtility.drawLabel(zoomHighContext,[$scope.overPixel.x-$scope.zoomPosition[0],
                            $scope.overPixel.y-$scope.zoomPosition[1]],'You',zoomPixSize);
                    } else if($scope.user.camp.grid == grid && $scope.mapElements.objects) {
                        canvasUtility.drawLabel(zoomHighContext,[$scope.overPixel.x-$scope.zoomPosition[0],
                            $scope.overPixel.y-$scope.zoomPosition[1]],'Your Camp',zoomPixSize);
                    }
                    $scope.overPixel.type = localTerrain[grid] ? 'land' : 'water';
                    $scope.overPixel.elevation = localTerrain[grid] ? localTerrain[grid] : 0;
                    $scope.overPixel.slope = localTerrain[grid] ? Math.round(gameUtility.getSlope(grid)/2) : '-';
                    $scope.overPixel.forest = terrainFeatures[grid] ? terrainFeatures[grid].forest : 0;
                } else { $scope.overPixel.type = $scope.overPixel.elevation = 
                    $scope.overPixel.slope = $scope.overPixel.forest = '-'; }
                var coords = [$scope.overPixel.x-$scope.zoomPosition[0], $scope.overPixel.y-$scope.zoomPosition[1]];
                var cursorType = $scope.editTerrain ? 'terrain' + $scope.brushSize : 'cursor';
                canvasUtility.drawSelect(zoomHighContext,coords,zoomPixSize,cursorType);
                $timeout(function() {});
            }
        };
        // When scrolling on the zoom canvas
        var zoomScroll = function(event, delta, deltaX, deltaY) {
            var doZoom = function() {
                if(deltaY < 0 && $scope.zoomLevel > 0) { $scope.changeZoom($scope.zoomLevel - 1); } 
                else if(deltaY > 0 && $scope.zoomLevel < zoomLevels.length-1) {
                    $scope.changeZoom($scope.zoomLevel + 1);
                }
                $('.zoom-slider').slider('setValue',$scope.zoomLevel);
                event.preventDefault(); return false;
            };
            clearTimeout(scrollTimer); scrollTimer = setTimeout(doZoom, 3);
        };
        var scrollTimer; // Timer to prevent scroll event firing twice in a row
        
        // Dim the pixel after leaving it
        var dimPixel = function() {
            canvasUtility.fillCanvas(zoomHighContext,'erase');
            if($scope.movePath.length > 0) { // Draw movement path
                canvasUtility.drawPath(zoomHighContext,$scope.user.location,
                    $scope.movePath,$scope.zoomPosition,zoomPixSize,$scope.moving);
            }
            if($scope.selectedGrid && $scope.selectedGrid.grid) { // Draw selection box around selected cell
                var coords = $scope.selectedGrid.grid.split(':');
                coords = [coords[0]-$scope.zoomPosition[0],coords[1]-$scope.zoomPosition[1]];
                canvasUtility.drawSelect(zoomHighContext,coords,zoomPixSize,'object');
            }
        };
        // When the mouse leaves the zoomed view
        var zoomOnMouseOut = function() {
            dimPixel();
            $timeout(function() { $scope.overPixel.x = $scope.overPixel.y = 
                $scope.overPixel.type = $scope.overPixel.elevation = 
                    $scope.overPixel.slope = $scope.overPixel.forest = '-' });
        };
        // Ping a pixel
        var ping = function() {
            if(pinging || $scope.overPixel.x == '-') { return; }
            pinging = [$scope.overPixel.x,$scope.overPixel.y];
            fireRef.child('meta/pings/'+pinging[0] + ":" + pinging[1]).set(true);
            $timeout(function(){unPing()},1600); // Keep ping for 5 seconds
        };
        // Un-ping a pixel
        var unPing = function() { fireRef.child('meta/pings/'+pinging[0]+":"+pinging[1]).remove(); pinging=false; };
        var drawPing = function(snapshot) { canvasUtility.drawPing(fullPingContext,snapshot.name().split(":")); };
        var hidePing = function(snapshot) { canvasUtility.clearPing(fullPingContext,snapshot.name().split(":")); };

        jQuery(zoomHighCanvas).mousedown(zoomOnMouseDown).mousemove(zoomOnMouseMove)
            .mouseleave(zoomOnMouseOut).mousewheel(zoomScroll);
        jQuery(fullHighCanvas).mousewheel(zoomScroll).mousemove(panOnMouseMove)
            .mousedown(panOnMouseDown).mouseup(onMouseUp);
    
        // Draw terrain, whether adding, changing, or removing
        var drawTerrain = function(coords,value) {
            if(value) { localTerrain[coords.join(':')] = value; } else
                { delete localTerrain[coords.join(':')]; }
//            canvasUtility.drawTerrain(zoomTerrainContext,localTerrain,coords,
//                $scope.zoomPosition,zoomPixSize);
            canvasUtility.fillCanvas(fullTerrainContext,'2c3d4b');
            canvasUtility.drawTerrain(fullTerrainContext,localTerrain,coords,0,0);
        };
        $scope.drawIso = function() { canvasUtility.drawIso(fullTerrainContext,localTerrain); };
        // Draw an object, whether adding, changing, or removing
        var drawObject = function(coords,value) {
            if(!$scope.mapElements.objects) { return; }
            if(!value) { 
                delete localObjects[coords.join(':')];
                if($scope.selectedGrid[0].grid == coords.join(':')) { 
                    delete $scope.selectedGrid; }
                canvasUtility.fillMainArea(fullObjectContext,'erase',coords,[1,1]);
            }
            canvasUtility.drawObject(zoomObjectContext,value,coords,
                $scope.zoomPosition,zoomPixSize);
            canvasUtility.drawObject(fullObjectContext,value,coords,0,0);
        };
        // Draw labels
        var drawLabel = function(coords,text) {
            if(!$scope.mapElements.labels) { return; }
            localLabels[coords.join(':')] = text;
            canvasUtility.drawLabel(zoomObjectContext,
                [coords[0]-$scope.zoomPosition[0],coords[1]-$scope.zoomPosition[1]],text,zoomPixSize);
            
        };
        
        // Adding and removing labels
        var addLabel = function(snap) { 
            if(localLabels[snap.name()] != snap.val()) {
                $timeout(function() {
                    $scope.eventLog.unshift({
                        time: new Date().getTime(), user: 'Someone', type: 'added a label', 
                        coords: snap.name().split(':')
                    });
                });
                drawLabel(snap.name().split(':'),snap.val());
            } 
        };
        var removeLabel = function(snap) { delete localLabels[snap.name()]; drawZoomCanvas(); };
    
        var sortArrayByProperty = function(arr, sortby, descending) {
            if(arr[0].hasOwnProperty(sortby)) {
                if(descending) { arr.sort(function(obj1, obj2) { return obj2[sortby] - obj1[sortby]}); } else {
                    arr.sort(function(obj1, obj2) { return obj1[sortby] - obj2[sortby]}); }
            } return arr;
        };
        
        // When player location changes, redraw fog, adjust view, redraw player
        var movePlayer = function(snap) {
            if(!snap.val()) { return; }
            if(snap.val().location == $scope.user.location) { return; }
//            if(snap.val().hasOwnProperty('campfires')) { // TODO: Re-use this for something else
//                $scope.onPixel.campfire = snap.val().campfires.hasOwnProperty(snap.val().location);
//                var campfireExpired = false; var newCampfires = {};
//                var theTime = new Date().getTime();
//                for(var cfKey in snap.val().campfires) {
//                    if(!snap.val().campfires.hasOwnProperty(cfKey)) { continue; }
//                    var campfire = { type:'campfire', created:snap.val().campfires[cfKey] };
//                    localObjects[cfKey] ? localObjects[cfKey].push(campfire) : localObjects[cfKey] = [campfire];
//                    if(snap.val().campfires[cfKey] + 57600000 < theTime) { // If older than 16 hours
//                        campfireExpired = true;
//                    } else { newCampfires[cfKey] = snap.val().campfires[cfKey]; }
//                }
//                if(campfireExpired) { fireUser.child('movement/campfires').set(newCampfires); }
//            }
            console.log('moving to',snap.val().location);
            if($scope.user.location) { 
                fireRef.child('camps/' + $scope.user.location).off();
                fireRef.child('abundances/' + $scope.user.location).off();
            } // Stop listening to last grid
            $scope.user.location = snap.val().location;
            $scope.onPixel = { 
                terrain: localTerrain[snap.val().location] ? 'Land' : 'Water', 
                slope: Math.round(gameUtility.getSlope(snap.val().location)/2), activities: [],
                forest: terrainFeatures[snap.val().location] ? terrainFeatures[snap.val().location].forest : 0,
                elevation: (localTerrain[snap.val().location] || 0), objects: localObjects[snap.val().location]
            };
            availableActivities = []; $scope.cantLook = false; $scope.lookCount = 0;
            // If there is a camp here
            if(localObjects[snap.val().location] && localObjects[snap.val().location].hasOwnProperty('camp')) { 
                $scope.onPixel.camp = localObjects[snap.val().location].camp;
                if(!$scope.user.hasOwnProperty('visitedCamps')) {
                    $scope.user.visitedCamps = [snap.val().location];
                    fireUser.child('visitedCamps').set($scope.user.visitedCamps);
                } else if(jQuery.inArray(snap.val().location,$scope.user.visitedCamps) < 0) {
                    $scope.user.visitedCamps.push(snap.val().location);
                    fireUser.child('visitedCamps').update($scope.user.visitedCamps);
                }
                var campData = gameUtility.expandCamp(snap.val().location);
                fireRef.child('camps/list/' + snap.val().location).on('value',function(campSnap) {
                    campSnap = campSnap.val();
                    for(var s = 0; s < $scope.services.length; s++) {
                        if(!campData.economy.hasOwnProperty($scope.services[s])) { continue; }
                        campData.economy[$scope.services[s]].refining = {}; 
                        campData.economy[$scope.services[s]].refined = {};
                    }
                    campData.economy.market.inventory = angular.copy($scope.inventory) || {};
                    for(var removeStall in campData.economy.market.stalls) {
                        if(!campData.economy.market.stalls.hasOwnProperty(removeStall)) { continue; }
                        if(removeStall.substr(0,2) == 'su') { 
                            delete campData.economy.market.stalls[removeStall]; }
                    }
                    var clearService = function(type) {
                        for(var r = 0; r < $scope.services.length; r++) {
                            if(!campData.economy.hasOwnProperty($scope.services[r])) { continue; }
                            campData.economy[$scope.services[r]][type] = null;
                        }
                    };
                    if(!campSnap) { // If no snap data
                        clearService('refining'); clearService('refined');
                        delete localObjects[snap.val().location].camp.selling;
                        fireUser.child('camps/'+snap.val().location+'/selling').remove();
                        $timeout(function(){ $scope.onPixel.camp = campData;
                            if(campData.economy.market.selectedStall &&
                                !campData.economy.market.stalls[campData.economy.market.selectedStall.id]) {
                                $scope.changeStall(removeStall,0); } // Un-select stall if deleted
                        }); 
                        return; 
                    }
                    // Add user stalls
                    if(campSnap.hasOwnProperty('userStalls')) {
                        for(var userStall in campSnap.userStalls) {
                            if(!campSnap.userStalls.hasOwnProperty(userStall)) { continue; }
                            var theStall = campData.economy.market.stalls[userStall] = {
                                id: userStall, canvas: localUsers[userStall.substring(2,userStall.length)].color,
                                goods: {}, goodCount: 0, categoryCount: 0, markup: 1, type: 'user' };
                            for(var good in campSnap.userStalls[userStall]) {
                                if(!campSnap.userStalls[userStall].hasOwnProperty(good)) { continue; }
                                var theGood = campSnap.userStalls[userStall][good];
                                var modelGood = gameUtility.dressItem({
                                    type: good.split(':')[0], name: good.split(':')[1],
                                    status: good.split(':')[2] });
                                var status = modelGood.status ? ':' + modelGood.status : '';
                                var catName = jQuery.inArray(modelGood.status,['meat','pelt']) < 0 ?
                                    modelGood.type == 'other' ? modelGood.name : modelGood.type : modelGood.status;
                                if(theStall.hasOwnProperty('categories')) {
                                    if(theStall.categories.hasOwnProperty(catName)) {
                                        theStall.categories[catName][0] += +theGood.amount;
                                        theStall.categories[catName].push(modelGood.name+status);
                                    } else { theStall.categories[catName] =
                                        [theGood.amount,modelGood.name+status]; }
                                } else { theStall.categories = {}; theStall.categories[catName] =
                                    [theGood.amount,modelGood.name+status]; }
                                theStall.goods[good] = {
                                    color: modelGood.color, type: modelGood.type, name: modelGood.name,
                                    weight: modelGood.weight, value: theGood.value,
                                    amount: theGood.amount, status: modelGood.status, key: good, exotic: 1 };
                                theStall.goods[good].prevGood = angular.copy(theStall.goods[good]);
                                theStall.goods[good].prevAmount = theStall.goods[good].amount;
                            }
                            Math.seedrandom(userStall);
                            theStall.bg = colorUtility.generate('stallBG').hex;
                            theStall.categoryCount = gameUtility.countProperties(theStall.categories);
                            theStall.goodCount = gameUtility.countProperties(theStall.goods);
                            campData.economy.market.stallCount++;
                            if(userStall.substring(2,userStall.length) == userID) {
                                var myStall = campSnap.userStalls[userStall];
                                for(var myGood in myStall) { if(!myStall.hasOwnProperty(myGood)) { continue; }
                                    if(campData.economy.market.inventory.hasOwnProperty(myGood)) {
                                        campData.economy.market.inventory[myGood].amount =
                                            +campData.economy.market.inventory[myGood].amount + +myStall[myGood].amount;
                                    } else {
                                        campData.economy.market.inventory[myGood] = gameUtility.dressItem({
                                            type: myGood.split(':')[0], name: myGood.split(':')[1], key: myGood,
                                            status: myGood.split(':')[2], amount: myStall[myGood].amount });
                                    }
                                }
                            }
                        }
                    }
                    // Apply modified stocks
                    if(campSnap.hasOwnProperty('stock')) {
                        for(var stallKey in campSnap.stock) { 
                            if(!campSnap.stock.hasOwnProperty(stallKey)) { continue; }
                            var stall = campSnap.stock[stallKey];
                            for(var goodKey in stall.goods) { if(!stall.goods.hasOwnProperty(goodKey)) { continue; }
                                if(!campData.economy.market.stalls.hasOwnProperty(stallKey) ||
                                    !campData.economy.market.stalls[stallKey].goods.hasOwnProperty(goodKey)) { 
                                    continue; }
                                var stockGood = { type: goodKey.split(':')[0], name: goodKey.split(':')[1], 
                                    status: goodKey.split(':')[2] };
                                var stockCatName = jQuery.inArray(stockGood.status,['meat','pelt']) < 0 ?
                                    stockGood.type == 'other' ? stockGood.name : stockGood.type : stockGood.status;
                                campData.economy.market.stalls[stallKey].categories[stockCatName][0] -=
                                    campData.economy.market.stalls[stallKey].goods[goodKey].amount - 
                                        stall.goods[goodKey];
                                campData.economy.market.stalls[stallKey].goods[goodKey].amount = stall.goods[goodKey];
                            }
                        }
                    }
                    
                    // Add refining refGoods to refineries
                    if(campSnap.hasOwnProperty('refining')) {
                        for(var i = 0; i < $scope.services.length; i++) {
                            if(!campSnap.refining.hasOwnProperty($scope.services[i])) {
                                campData.economy[$scope.services[i]].refining = null; continue; }
                            var notOwnRefining = true;
                            for(var refiningKey in campSnap.refining[$scope.services[i]]) {
                                if(!campSnap.refining[$scope.services[i]].hasOwnProperty(refiningKey)) { continue; }
                                var refining = campSnap.refining[$scope.services[i]][refiningKey];
                                if(refiningKey.split(':-:')[0] == userID) {
                                    notOwnRefining = false; refining = {
                                        amount: refiningKey.split(':-:')[2],
                                        type: refiningKey.split(':-:')[1].split(':')[0],
                                        name: refiningKey.split(':-:')[1].split(':')[1],
                                        status: refiningKey.split(':-:')[1].split(':')[2], started: refining
                                    };
                                    if(!campData.economy[$scope.services[i]].hasOwnProperty('refining')) {
                                        campData.economy[$scope.services[i]].refining = {};
                                    }
                                    campData.economy[$scope.services[i]].refining[refiningKey.split(':-:')[1]+
                                        refiningKey.split(':-:')[3]] = gameUtility.dressItem(refining);
                                }
                            }
                            if(notOwnRefining) { campData.economy[$scope.services[i]].refining = null; }
                        }
                    } else { clearService('refining'); }
                    // Add refined refGoods to refineries
                    if(campSnap.hasOwnProperty('refined')) {
                        for(var j = 0; j < $scope.services.length; j++) {
                            if(!campSnap.refined.hasOwnProperty($scope.services[j])) { 
                                campData.economy[$scope.services[j]].refined = null; continue; }
                            var notOwnRefined = true;
                            for(var refinedKey in campSnap.refined[$scope.services[j]]) {
                                if(!campSnap.refined[$scope.services[j]].hasOwnProperty(refinedKey)) { continue; }
                                var refined = campSnap.refined[$scope.services[j]][refinedKey];
                                if(refinedKey.split(':-:')[0] == userID) {
                                    notOwnRefined = false; refined = {
                                        amount: refinedKey.split(':-:')[2], 
                                        type: refinedKey.split(':-:')[1].split(':')[0],
                                        name: refinedKey.split(':-:')[1].split(':')[1], key: refinedKey
                                    };
                                    if(!campData.economy[$scope.services[j]].hasOwnProperty('refined')) {
                                        campData.economy[$scope.services[j]].refined = {};
                                    }
                                    campData.economy[$scope.services[j]].refined[refinedKey.split(':-:')[1]+
                                        refinedKey.split(':-:')[3]] = gameUtility.dressItem(refined);
                                }
                            }
                            if(notOwnRefined) { campData.economy[$scope.services[j]].refined = null; }
                        }
                    } else { clearService('refined'); }
                    
                    // Update "selling" amount in user/camps to reflect any sold goods
                    if(campData.economy.market.stalls.hasOwnProperty('su1')) {
                        localObjects[snap.val().location].camp.selling = 
                            gameUtility.countProperties(campData.economy.market.stalls.su1.goods);
                        fireUser.child('camps/'+snap.val().location+'/selling').set(
                            localObjects[snap.val().location].camp.selling);
                    } else { 
                        delete localObjects[snap.val().location].camp.selling;
                        fireUser.child('camps/'+snap.val().location+'/selling').remove(); 
                    }
                    // Reselect or delete selected stall/good
                    $timeout(function() {
                        $scope.onPixel.camp = campData;
                        var market = $scope.onPixel.camp.economy.market;
                        if(market.selectedStall) { // If stall selected
                            if(!market.stalls[market.selectedStall.id]) { delete market.selectedStall; // Gone, delete
                            } else { // Selected stall still exists
                                var keptSide;
                                if(market.selectedStall.selectedGood) { // If good selected
                                    if(!market.selectedStall.goods[market.selectedStall.selectedGood.key]) {
                                        delete market.selectedStall.selectedGood; // Gone, delete
                                    } else { // Selected good still exists
                                        keptSide = market.selectedStall.rightSide;
                                        var gKey = market.selectedStall.selectedGood.key;
                                        var bAmount = Math.min(market.selectedStall.selectedGood.buyAmount,
                                            market.stalls[market.selectedStall.id].goods[gKey].amount);
                                        market.selectedStall = market.stalls[market.selectedStall.id];
                                        market.selectedStall.rightSide = keptSide;
                                        market.selectedStall.selectedGood = market.selectedStall.goods[gKey];
                                        market.selectedStall.selectedGood.buyAmount = bAmount
                                    }
                                } else { // Stall selected, no good selected
                                    keptSide = market.selectedStall.rightSide;
                                    market.selectedStall = market.stalls[market.selectedStall.id];
                                    market.selectedStall.rightSide = keptSide;
                                }
                            }
                        }
                    });
                });
            } else { // If no camp
                fireRef.child('abundances/'+$scope.user.location).on('value',function(snap) {
                    abundances = snap.val() || {}; createActivities(); });
            }
            var previousPixels = angular.copy(visiblePixels), drawPixels = {};
            visiblePixels = gameUtility.getVisibility(visiblePixels,snap.val().location);
            for(var visKey in visiblePixels) { if(!visiblePixels.hasOwnProperty(visKey)) { continue; } 
                if(previousPixels.hasOwnProperty(visKey)) { 
                    if(previousPixels[visKey] != visiblePixels[visKey]) { drawPixels[visKey]=visiblePixels[visKey]; }
                } else { drawPixels[visKey] = visiblePixels[visKey]; }
            }
            canvasUtility.drawFog(fullFogContext,fullTerrainContext,drawPixels,localTerrain,terrainFeatures);
            //canvasUtility.drawAllTerrain(fullTerrainContext,localTerrain,visiblePixels);
            var firstWater; $scope.movePath = snap.val().movePath || [];
            for(var i = 0; i < $scope.movePath.length; i++) {
                if(visiblePixels.hasOwnProperty($scope.movePath[i]) &&
                    !localTerrain.hasOwnProperty($scope.movePath[i])) { // If water
                    firstWater = $scope.movePath[i]; break; // End path just before the water
                }
            } // Get rid of rest of path from water
            if(firstWater) { $scope.movePath.splice(jQuery.inArray(firstWater,$scope.movePath),999); } 
            if($scope.movePath.length == 0) { $scope.moving = false; }
            else { var moveTime = 5 * (1 + localTerrain[$scope.movePath[0]] / 60); playWaitingBar(moveTime); }
            fireUser.child('visiblePixels').set(visiblePixels);
            $timeout(function() {
                var x = snap.val().location.split(':')[0], y = snap.val().location.split(':')[1];
                var offX = x > 277 ? 277 - x : x < 22 ? 22 - x : 0; // Keep zoom view in-bounds
                var offY = y > 284 ? 284 - y : y < 14 ? 14 - y : 0;
                $scope.zoomPosition = [x - 22 + offX, y - 14 + offY];
                zoomSize = [45,30]; lastZoomPosition = $scope.zoomPosition;
                viewCenter = [$scope.zoomPosition[0] + zoomSize[0]/2, $scope.zoomPosition[1] + zoomSize[1]/2];
                localStorage.set('zoomPosition',$scope.zoomPosition);
                canvasUtility.fillCanvas(fullHighContext,'erase'); // Draw new zoom highlight area
                canvasUtility.fillMainArea(fullHighContext,'rgba(255, 255, 255, 0.06)',
                    lastZoomPosition,zoomSize);
                $scope.changeZoom(4);
                jQuery('.zoom-slider').slider('setValue',$scope.zoomLevel);
            });
        };
        
        // Download the map terrain data from firebase
        var downloadTerrain = function() {
            jQuery.ajax({ url: 'data/terrain.json', dataType: 'json' }).done(function(results) {
                console.log('new terrain downloaded');
                localTerrain = results; // Download the whole terrain object at once into localTerrain
                $scope.lastTerrainUpdate = new Date().getTime();
                localStorage.set('lastTerrainUpdate',$scope.lastTerrainUpdate);
                localStorage.set('terrain',localTerrain);
                prepareTerrain();
            });
        };
        var initTerrain = function() {
            if($scope.lastTerrainUpdate) { // If terrain was updated before, check for new updates
                fireRef.child('lastTerrainUpdate').once('value',function(snap) {
                    var needUpdate = true;
                    if(snap.val().time <= $scope.lastTerrainUpdate) { needUpdate = false; }
                    if(needUpdate) { downloadTerrain(); } else {
                        localTerrain = localStorage.get('terrain');
                        // Turn terrain and labels 180 degrees
//                        var terrain180 = gameUtility.terrain180(localTerrain);
//                        fireRef.child('terrain').set(terrain180);
//                        fireRef.child('lastTerrainUpdate').set({time: new Date().getTime(), user: '1'});
//                        var labels180 = gameUtility.terrain180(localLabels);
//                        fireRef.child('labels').set(labels180);
                        prepareTerrain();
                    }
                });
            } else { downloadTerrain(); }
        };
        var prepareTerrain = function() {
            $scope.terrainReady = true;
            gameUtility.attachTerrain(localTerrain);
            jQuery.ajax({ url: 'data/forest.json', dataType: 'json' }).done(function(forestTiles) {
//            var forestTiles = gameUtility.generateForests();
                for(var ftKey in forestTiles) { if(!forestTiles.hasOwnProperty(ftKey)) { continue; }
                    if(terrainFeatures.hasOwnProperty(ftKey)) { terrainFeatures[ftKey].forest = forestTiles[ftKey]; }
                    else { terrainFeatures[ftKey] = {forest:forestTiles[ftKey]}; }
                }
                gameUtility.attachTerrainFeatures(terrainFeatures);
                var terrainImg = new Image;
                terrainImg.onload = function() { fullTerrainContext.drawImage(terrainImg,0,0);
//                canvasUtility.drawTerrainFeatures(fullTerrainContext,terrainFeatures);
                    canvasUtility.drawFog(fullFogContext,fullTerrainContext,visiblePixels,
                        localTerrain,terrainFeatures);
                    fireUser.child('movement').on('value', movePlayer);
                };
                terrainImg.src = 'img/world-map.png';
                fireRef.child('campList').once('value',function(snap) {
                    if(!snap.val() && userID < 3) { // Generate camps if none on firebase
                        var nativeLocations = gameUtility.genNativeCamps();
                        fireRef.child('campList').set(nativeLocations); return;
                    }
                    campList = snap.val();
                    for(var i = 0; i < campList.length; i++) { // Store camps in localObjects
                        Math.seedrandom(campList[i]);
                        var x = parseInt(campList[i].split(':')[0]), y = parseInt(campList[i].split(':')[1]);
                        var camp = { type: 'camp', name: Chance(x*1000 + y).word(), grid: campList[i] };
                        if(localObjects.hasOwnProperty(campList[i])) { localObjects[campList[i]].camp = camp; }
                        else { localObjects[campList[i]] = { camp: camp }; }
                    }
                    fireUser.child('camps').on('value', function(snap) {
                        var camps = snap.val();
                        for(var v = 0, vc = $scope.user.visitedCamps.length; v < vc; v++) {
                            delete localObjects[$scope.user.visitedCamps[v]].camp.refining;
                            delete localObjects[$scope.user.visitedCamps[v]].camp.selling;
                        }
                        for(var campKey in camps) { if(!camps.hasOwnProperty(campKey)) { continue; }
                            for(var infoKey in camps[campKey]) {
                                if(!camps[campKey].hasOwnProperty(infoKey)) { continue; }
                                localObjects[campKey].camp[infoKey] = camps[campKey][infoKey];
                            }
                        }
                        drawZoomCanvas();
                    });
                });
                fireUser.child('stats/hunger').on('value', function(snap) {
                    $scope.user.stats = $scope.user.stats ? $scope.user.stats : { hunger: 100 };
                    $timeout(function(){$scope.user.stats.hunger = snap.val();});
                });
                var myConnectionsRef = fireUser.child('connections');
                var lastOnlineRef = fireUser.child('lastOnline');
                var connectedRef = new Firebase('https://geographr.firebaseio.com/.info/connected');
                connectedRef.on('value', function(snap) {
                    if (snap.val() === true) {
                        var con = myConnectionsRef.push(true);
                        fireServer.push({ user: userID, action: 'logIn' });
                        con.onDisconnect().remove();
                        lastOnlineRef.onDisconnect().set(Firebase.ServerValue.TIMESTAMP);
                    }
                });
            });
        };
        
        fireRef.child('labels').once('value',function(snap) {
            localLabels = snap.val();
            fireRef.child('labels').on('child_added', addLabel);
            fireRef.child('labels').on('child_removed', removeLabel);
        });
        fireRef.child('meta/pings').on('child_added', drawPing);
        fireRef.child('meta/pings').on('child_removed', hidePing);
        fireRef.child('status').on('value', function(snap) { // When the server status changes
            $timeout(function() { 
                $scope.serverStatus = snap.val();
                if(snap.val() == 'offline') {
                    if($scope.moving) {
                        $scope.eventLog.push({ time: new Date().getTime(),
                            user: 'Server offline, movement cancelled.' })
                    }
                    $timeout(function() { $scope.moving = false; });
                }
            });
        });
    
        var onKeyDown = function(e) {
            if(!keyUpped) { return; }
            keyUpped = false;
            switch (e.which) {
                case 65: ping(); break; // A
            }
        };
    
        jQuery(window).keydown(onKeyDown).keyup(function() { keyUpped = true; });

        jQuery.ajax({ // Get last 8 commits from github
            url: 'https://api.github.com/repos/vegeta897/geographr/commits',
            dataType: 'jsonp',
            success: function(results) {
                for(var i = 0; i < results.data.length; i++) {
                    $scope.commits.list.push({
                        message:results.data[i].commit.message,date:Date.parse(results.data[i].commit.committer.date)
                    });
                    if($scope.commits.list.length > 9) { break; }
                }
            }
        });
}])
;