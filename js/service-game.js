/* Game logic service */

angular.module('Geographr.game', []).service('gameUtility', function(actCanvasUtility,canvasUtility,colorUtility) {
    // TODO: Move all these data sets into a separate file
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
    var itemsMaster = {
        animal: {
            'deer': { color: '6f4c32', weight: 180, value: 30, classes: ['pelt'], nativeY: 150, range: 70 },
            'boar': { color: '49413d', weight: 150, value: 25, classes: ['pelt'], nativeY: 250, range: 80 },
            'rabbit': { color: '6d5f58', weight: 3, value: 6, classes: ['pelt'], nativeY: 120, range: 120 },
            'fox': { color: '6d341e', weight: 35, value: 50, classes: ['pelt'], nativeY: 140, range: 40 },
            'wolf': { color: '4b4c4f', weight: 60, value: 80, classes: ['pelt'], nativeY: 50, range: 50 },
            'mole': { color: '433a32', weight: 2, value: 20, classes: ['pelt'], nativeY: 120, range: 40 },
            'pheasant': { color: '713926', weight: 1, value: 5, classes: [], nativeY: 150, range: 70 },
            'duck': { color: '356943', weight: 3, value: 8, classes: [], nativeY: 180, range: 100 }
        },
        fish: {
            'bass': { color: 'a8b490', weight: 1.6, value: 5, nativeY: 180, range: 140 }, 
            'herring': { color: '838d96', weight: 0.2, value: 1, nativeY: 140, range: 60 }, 
            'salmon': { color: 'c69c9e', weight: 0.5, value: 7, nativeY: 150, range: 200 }, 
            'trout': { color: 'd0ae91', weight: 1.2, value: 3, 
                nativeY: 120, range: 50 }, // TODO: Only in rivers/lakes
            'tuna': { color: '8ea293', weight: 2, value: 10, nativeY: 180, range: 120 }, 
            'sardine': { color: '67778e', weight: 0.1, value: 0.5, nativeY: 150, range: 80 },
            'mackerel': { color: '71978e', weight: 0.4, value: 1, nativeY: 200, range: 100 }, 
            'cod': { color: 'aba383', weight: 2, value: 3, nativeY: 100, range: 80 }, 
            'swordfish': { color: '8189af', weight: 2.1, value: 20, nativeY: 260, range: 60 }
        },
        fruit: {
            'apple': { color: '9c2c36', weight: 1, value: 5, abundance: 10, nativeY: 150, range: 80 },
            'blueberries': { color: '334c9e', weight: 0.8, value: 1, abundance: 8, nativeY: 200, range: 120 },
            'pear': { color: '9cc245', weight: 1.2, value: 8, abundance: 8, nativeY: 250, range: 80 }, 
            'banana': { color: 'e3d843', weight: 1.3, value: 7, abundance: 4, nativeY: 280, range: 40 },
            'orange': { color: 'd98f40', weight: 1.2, value: 6, abundance: 8, nativeY: 220, range: 50 }, 
            'peach': { color: 'e9a16c', weight: 1.1, value: 9, abundance: 6, nativeY: 210, range: 60 }
        },
        gem: {
            'emerald': { color: '4f8e4f', value: 200, weight: 0.5, profession: 'jeweler' },
            'ruby': { color: '8e4242', value: 300, weight: 0.5, profession: 'jeweler' },
            'topaz': { color: 'a69748', value: 150, weight: 0.5, profession: 'jeweler' },
            'sapphire': { color: '485ea6', value: 320, weight: 0.5, profession: 'jeweler' },
            'diamond': { color: 'c8c3c5', value: 2000, weight: 0.6, profession: 'jeweler' }
        },
        metal: {
            'iron': { color: '593125', value: 36, weight: 10, abundance: 15, unit: {post:'ingots'},
                profession: 'blacksmith' },
            'copper': { color: '924c36', value: 28, weight: 8, abundance: 20, unit: {post:'ingots'},
                profession: 'blacksmith' },
            'silver': { color: 'b0b0b0', value: 200, weight: 3, abundance: 0.5, unit: {post:'ingots'},
                profession: 'blacksmith' },
            'gold': { color: 'cab349', value: 500, weight: 2, abundance: 0.1, unit: {post:'ingots'},
                profession: 'blacksmith' }
        },
        plant: {
            'brown mushroom': { color: '6f6053', nativeY: 160, range: 100 }, 
            'white mushroom': { color: 'b0a9a4', nativeY: 150, range: 100 },
            'herbs': { color: '728448', nativeY: 200, range: 150 },
            'red berries': { color: '9e3333', weight: 0.1, abundance: 20, nativeY: 200, range: 180 },
            'green berries': { color: '689e48', weight: 0.1, abundance: 23, nativeY: 160, range: 100 }
        },
        tool: {
            'pitchfork': { color: '88837f', weight: 15 }
        },
        weapon: {
            'small dagger': { color: '757270', weight: 4, classes: ['blade'] }
        },
        vegetable: {
            'potato': { color: '675342', weight: 1.2, value: 3, abundance: 18, nativeY: 120, range: 60 }, 
            'onion': { color: 'aaa982', weight: 1.1, value: 4, abundance: 13, nativeY: 120, range: 60 },
            'carrot': { color: 'e1934f', weight: 0.7, value: 2.5, abundance: 18, nativeY: 120, range: 80 },
            'lettuce': { color: 'b4d474', weight: 2, value: 4, abundance: 10, nativeY: 120, range: 80 },
            'tomato': { color: 'd3352e', weight: 1.2, value: 5, abundance: 15, nativeY: 220, range: 100 },
            'broccoli': { color: '62803c', weight: 1, value: 2, abundance: 14, nativeY: 180, range: 100 },
            'cabbage': { color: 'aac37a', weight: 2.4, value: 3, abundance: 8, nativeY: 120, range: 80 },
            'corn': { color: 'e9cb63', weight: 0.9, value: 4, abundance: 20, nativeY: 180, range: 100 }
        },
        other: {
            'salt': { color: 'a8a797', value: 4, weight: 3, abundance: 20, unit: {pre:'pouches'}, 
                profession: 'saltFarm' },
            'coal': { color: '191a1a', value: 6, weight: 6, abundance: 25, unit: {post:'chunks'}, 
                profession: 'blacksmith' },
            'lumber': { color: '8e7a54', value: 4, weight: 20, abundance: 15, unit: {pre:'planks'} },
            'spices': { color: '925825', value: 60, weight: 1, abundance: 3, unit: {pre:'pouches'} },
            'wool': { color: '9e9b81', value: 48, weight: 4, abundance: 10, unit: {pre:'sacks'} }
        }
    };
    var eventProducts = {
        fish: {
            'fish:bass': { rarity: 0.2 }, 'fish:herring': { rarity: 0.1 }, 'fish:salmon': { rarity: 0.3 },
            'fish:trout': { rarity: 0.3 }, 'fish:tuna': { rarity: 0.5 }, 'fish:sardine': { rarity: 0 },
            'fish:mackerel': { rarity: 0.7 }, 'fish:cod': { rarity: 0.1 }, 'fish:swordfish': { rarity: 0.9 }
        },
        forage: {
            'plant:red berries': { rarity: 0.3, avgQty: 3 }, 'fruit:blueberries': { rarity: 0.5, avgQty: 2 },
            'plant:green berries': { rarity: 0.2, avgQty: 3 },
            'plant:brown mushroom': { rarity: 0, avgQty: 3 },
            'plant:white mushroom': { rarity: 0.3, avgQty: 2 },
            'plant:herbs': { rarity: 0.6, avgQty: 2 }, 'vegetable:onion': { rarity: 0.7, avgQty: 1 }
        },
        hunt: {
            'animal:deer': { rarity: 0.4 }, 'animal:boar': { rarity: 0.7 },
            'animal:rabbit': { rarity: 0 }, 'animal:fox': { rarity: 0.8 },
            'animal:wolf': { rarity: 0.9 }, 'animal:mole': { rarity: 0.9 },
            'animal:pheasant': { rarity: 0.7 }, 'animal:duck': { rarity: 0.8 }
        },
        mine: {
            'other:salt': { rarity: 0 }, 'other:coal': { rarity: 0.2 },
            'metal:iron': { rarity: 0.4 }, 'metal:copper': { rarity: 0.3 },
            'metal:silver': { rarity: 0.8 }, 'metal:gold': { rarity: 0.85 },
            'gem:emerald': { rarity: 0.8 }, 'gem:ruby': { rarity: 0.85 }, 'gem:topaz': { rarity: 0.75 }, 
            'gem:sapphire': { rarity: 0.85 }, 'gem:diamond': { rarity: 0.95 }
        }
    };
    var economyNodes = {
        'hunting post': { 
            output: ['event:hunt:process:2'], occurrence: 'forest:1', nativeY: 300, range: 250 }, 
        'fishing dock': { output: ['event:fish:15'], occurrence: 'coast:0.6', nativeY: 150, range: 300 },
        'mining camp': { output: ['event:mine:8'], occurrence: 'mountains:1.8', nativeY: 150, range: 300 }, 
        'farm': { output: ['vegetable:10'], occurrence: 'plains:0.5', nativeY: 300, range: 200 },
        'orchard': { output: ['fruit:8'], occurrence: 'plains:0.3', nativeY: 300, range: 180 }, 
        'lumber camp': { output: ['other:lumber:8'], occurrence: 'forest:1.2', nativeY: 180, range: 110 }
    };
    var marketStallTypes = {
        fish: { goods: ['fish'], capacity: 50 }, 
        'animal pelt': { goods: ['animal:pelt'], capacity: 12 },
        'animal meat': { goods: ['animal:meat'], capacity: 50 },
        meat: { goods: ['fish','animal:meat'], capacity: 65 },
        animal: { goods: ['animal'], capacity: 400 },
        'small animal': { 
            goods: ['animal:rabbit','animal:mole','animal:pheasant','animal:duck'], capacity: 50 },
        'large animal': { goods: ['animal:deer','animal:boar','animal:fox','animal:wolf'], capacity: 600 },
        food: { goods: ['fish','fruit','vegetable','animal:meat'], capacity: 60 },
        fruit: { goods: ['fruit'], capacity: 40 }, 
        vegetable: { goods: ['vegetable'], capacity: 45 }, 
        'fruit+veg': { goods: ['fruit','vegetable'], capacity: 50 },
        metal: { goods: ['metal'], capacity: 300 }, 
        'industrial metal': { goods: ['metal:copper','metal:iron'], capacity: 300 },
        jewelry: { goods: ['gem','metal:silver','metal:gold'], capacity: 20 }, 
        mineral: { goods: ['other:salt','other:coal'], capacity: 180 },
        construction: { goods: ['other:lumber','metal:copper','metal:iron'], capacity: 500 }, 
        lumber: { goods: ['other:lumber'], capacity: 800 }
    };
    var similarMarketStalls = {
        fish: ['fish','food','vegetable','fruit+veg','animal meat','meat'], 
        'animal pelt': ['animal','small animal','large animal'],
        'animal meat': ['animal','small animal','large animal','meat','fish'],
        meat: ['animal','small animal','large animal','animal meat','fish','food','vegetable'],
        animal: ['fish','small animal','large animal','animal pelt','animal meat','meat'],
        'small animal': ['fish','large animal','animal'], 'large animal': ['fish','small animal','animal'],
        food: ['fish','fruit','vegetable','fruit+veg','animal meat','meat'], 
        fruit: ['food','vegetable','fish','fruit+veg'],
        vegetable: ['food','fruit','fish','fruit+veg'], 'fruit+veg': ['food','fruit','vegetable','fish'], 
        metal: ['construction','industrial metal','jewelry','lumber','mineral'],
        'industrial metal': ['metal','lumber','construction'],
        jewelry: ['mineral','metal'], mineral: ['jewelry','metal','industrial metal'],
        construction: ['lumber','metal','industrial metal'],
        lumber: ['construction','metal','industrial metal']
    };
    var edibles = {
        'red berries': { energy: 2 }, 'blueberries': { energy: 3 },
        'green berries': { energy: 2, effects: ['poison','nasty'], cookedEnergy: 3 },
        'brown mushroom': { energy: 4, cookedEnergy: 5 },
        'white mushroom': { energy: 4, cookedEnergy: 5 },
        'spices': { energy: 1, effects: ['nasty'] },
        'onion': { energy: 4, effects: ['nasty'], cookedEnergy: 5 },
        'apple': { energy: 6 }, 'pear': { energy: 8 }, 'banana': { energy: 8 },
        'orange': { energy: 9 }, 'peach': { energy: 7 },
        'potato': { energy: 5, effects: ['nasty'], cookedEnergy: 10 },
        'fish': { energy: 20, effects: ['nasty','bacterial'], cookedEnergy: 25 },
        'meat': { energy: 60, effects: ['nasty','bacterial'], cookedEnergy: 65 }
    };
    var equipment = {
        'small dagger': { weight: 4, color: '757270', classes: ['blade'] }
    };
    // References to controller stuff
    var scope, terrain, userInventory, fireRef, fireUser, fireInventory;
    var event = {}; // Holds event details
    var randomIntRange = function(min,max) { return Math.floor(Math.random() * (max - min + 1)) + min; };
    var randomRange = function(min,max) { return Math.random() * (max-min) + min; };
    var toRadians = function(angle) { return angle * 0.0174533; };
    var toDegrees = function(angle) { return (angle * 57.2957795 + 360) % 360; };
    var getDigit = function(num, digit) { return Math.floor(num / (Math.pow(10, digit-1)) % 10) };
    var pickProperty = function(object) { // Return a random property key from input object
        var array = []; for(var key in object) { if(object.hasOwnProperty(key)) { array.push(key); } }
        return pickInArray(array);
    };
    var escapeRegExp = function(string) { return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1"); };
    var replaceAll = function(find, replace, str) {
        return str.replace(new RegExp(escapeRegExp(find), 'g'), replace); };

    var genCampEconomy = function(grid) {
        // First create economic nodes
        var campNodes = {}, productPool = { list: [], categories: {}, stallTypes: {} };
        var today = new Date();
        for(var nodeKey in economyNodes) { if(!economyNodes.hasOwnProperty(nodeKey)) { continue; }
            Math.seedrandom(nodeKey+grid);
            var node = economyNodes[nodeKey], amount = node.occurrence.split(':')[1], occurred = 0;
            var distance = node.nativeY ? Math.abs(grid.split(':')[1] - node.nativeY) : 0;
            var maxDistance = node.nativeY ?
                node.range + Math.random() * (node.range/2) - (node.range/4) : 1;
            if(distance > maxDistance) { continue; }
            var campNode = campNodes[nodeKey] = { amount: 0 };
            switch(node.occurrence.split(':')[0]) {
                case 'coast': 
                    occurred = getNearCoast(grid,3.5).length;
                    break;
                case 'mountains':
                    occurred = getNearMiningAbundance(grid,3.5);
                    break;
                case 'plains':
                    occurred = Math.max(0,8 - getNearMiningAbundance(grid,3.5));
                    break;
                case 'forest':
                    occurred = Math.max(0,4 - getNearMiningAbundance(grid,3.5));
                    break;
            }
            campNode.amount = Math.round(occurred * amount +
                occurred * (Math.random() * amount - (amount/2)) * 0.8);
            if(campNode.amount <= 0) { delete campNodes[nodeKey]; continue; }
            var outputAmount = node.output[0].split(':')[node.output[0].split(':').length-1];
            Math.seedrandom(today.getYear()+'/'+today.getMonth()+'/'+today.getDate()+nodeKey+grid); // Daily
            campNode.output = Math.ceil(outputAmount * campNode.amount +
                outputAmount * (Math.random() * campNode.amount - (campNode.amount/2)) * 0.8);
            // TODO: If high variance, have market people comment on it
            campNode.variance = campNode.output / (outputAmount * campNode.amount);
            for(var i = 0; i < campNode.output; i++) {
                var pushProduct = {};
                if(node.output[0].split(':').length == 3 && node.output[0].split(':')[0] != 'event') {
                    pushProduct = 
                        angular.copy(itemsMaster[node.output[0].split(':')[0]][node.output[0].split(':')[1]]);
                    pushProduct.type = node.output[0].split(':')[0]; 
                    pushProduct.name = node.output[0].split(':')[1];
                } else { pushProduct = pickProduct(node.output[0],grid); }
                pushProduct.value = Math.max(0.1,pushProduct.value * (campNode.variance - 2) * -1 
                    * (1+Math.random()*0.05));
                var pushProducts = [pushProduct];
                if(node.output[0].split(':')[2] == 'process') {
                    pushProducts = pushProduct.type == 'animal' ? eviscerate(1,pushProduct,9.6) : null;
                }
                for(var pp = 0; pp < pushProducts.length; pp++) {
                    pushProduct = pushProducts[pp];
                    pushProduct.amount = pushProduct.amount || 1;
                    productPool.list.push(pushProduct);
                    var ppStatus = pushProduct.status ? ':' + pushProduct.status : '';
                    for(var msTypeKey in marketStallTypes) {
                        if(!marketStallTypes.hasOwnProperty(msTypeKey)) { continue; }
                        var goods = marketStallTypes[msTypeKey].goods;
                        if(jQuery.inArray(pushProduct.type+ppStatus,goods) +
                            jQuery.inArray(pushProduct.type+':'+pushProduct.name+ppStatus,goods) > -2) {
                            if(productPool.stallTypes.hasOwnProperty(msTypeKey)) {
                                productPool.stallTypes[msTypeKey].weight += 
                                    pushProduct.weight * pushProduct.amount;
                                productPool.stallTypes[msTypeKey].count += pushProduct.amount;
                            } else {
                                productPool.stallTypes[msTypeKey] = { 
                                    weight: pushProduct.weight*pushProduct.amount, count: pushProduct.amount 
                                };
                            }
                        }
                    }
                    if(productPool.categories.hasOwnProperty(pushProduct.type+ppStatus)) {
                        productPool.categories[pushProduct.type+ppStatus] += pushProduct.amount;
                    } else { productPool.categories[pushProduct.type+ppStatus] = pushProduct.amount; }
                }
            }
        }
//        console.log('camp nodes:',campNodes,'pool:',angular.copy(productPool));
        Math.seedrandom('stalls'+grid);
        
        // Set up stall types
        var chosenStallTypes = {};
        while(productPool.list.length > 0) {
            msTypeKey = pickProperty(productPool.stallTypes); var stall; var num = 1; var chosen = false;
            while(!chosen) { if(!chosenStallTypes.hasOwnProperty(msTypeKey+num)) {
                chosenStallTypes[msTypeKey+num] = { goods: {}, weight: 0 };
                stall = chosenStallTypes[msTypeKey+num];
                Math.seedrandom('stalls'+grid+msTypeKey+num); chosen = true;
            } num++; }
            stall.stallType = msTypeKey;
            for(var p = 0; p < productPool.list.length; p++) { // Find matching products
                var status = productPool.list[p].status ? ':' + productPool.list[p].status : '';
                var catName = jQuery.inArray(productPool.list[p].status,['pelt','meat']) < 0 ?
                    productPool.list[p].type == 'other' ? productPool.list[p].name : 
                        productPool.list[p].type : productPool.list[p].status;
                if(jQuery.inArray(productPool.list[p].type+status,marketStallTypes[msTypeKey].goods) +
                    jQuery.inArray(productPool.list[p].type+':'+productPool.list[p].name+status,
                        marketStallTypes[msTypeKey].goods) < -1) { continue; }
                // TODO: If exotic product picked, have stall owner comment on it
                var product = productPool.list.splice(p,1)[0]; p--; // Don't skip next product
                var goodKey = product.status ? [product.type,product.name,product.status].join(':') :
                    [product.type,product.name].join(':');
                product.amount = product.amount || 1; product.exotic = product.exotic || 1;
                if(stall.hasOwnProperty('categories')) { // If stall has categories
                    if(stall.categories.hasOwnProperty(catName)) { // If category match
                        if(stall.goods.hasOwnProperty(goodKey)) { // If good already here
                            stall.categories[catName][0] += product.amount; // Add cat item count
                            stall.goods[goodKey].amount += product.amount; // Add good amount
                        } else { // If good not already here
                            stall.categories[catName][0] += product.amount; // Add item count
                            stall.goods[goodKey] = // Add good
                            { color: product.color, type: product.type, weight: product.weight,
                                value: Math.max(1,Math.round((Math.random()*0.4+0.8)*
                                    product.value*product.exotic*100)/100),
                                amount: product.amount, name: product.name, status: product.status,
                                key: goodKey, exotic: product.exotic };
                            stall.categories[catName].push(goodKey); // Add name
                        }
                    } else { // No matching category, add as new
                        stall.categories[catName] = [product.amount,goodKey]; // Init
                        stall.goods[goodKey] = // Add good
                        { color: product.color, type: product.type, weight: product.weight,
                            value: Math.max(1,Math.round((Math.random()*0.4+0.8)*
                                product.value*product.exotic*100)/100),
                            amount: product.amount, name: product.name, status: product.status,
                            key: goodKey, exotic: product.exotic };
                    }
                } else { // Stall has no categories
                    stall.categories = {}; 
                    stall.canvas = colorUtility.generate('stallCanvas').hex;
                    stall.bg = colorUtility.generate('stallBG').hex;
                    stall.categories[catName] = [product.amount,goodKey]; // Init
                    stall.goods[goodKey] = // Add good
                    { color: product.color, type: product.type, weight: product.weight,
                        value: Math.max(1,Math.round((Math.random()*0.4+0.8)*
                            product.value*product.exotic*100)/100),
                        amount: product.amount, name: product.name, status: product.status,
                        key: goodKey, exotic: product.exotic };
                }
                stall.weight += product.weight*product.amount; // Add product weight to total stall weight
                productPool.stallTypes[msTypeKey].count -= product.amount;
                if(productPool.stallTypes[msTypeKey].count <= 0) { // If no goods left in this stall type
                    delete productPool.stallTypes[msTypeKey]; break; // Don't try this stall type again
                }
                if(productPool.stallTypes[msTypeKey].count <= 0 || countProperties(stall.goods) > 7 ||
                    stall.weight >= marketStallTypes[msTypeKey].capacity) {
                    break; // All applicable products added, or stall over weight capacity/good variety
                }
            }
            if(stall.weight < marketStallTypes[msTypeKey].capacity && countProperties(stall.goods) < 8) {
                delete productPool.stallTypes[msTypeKey]; // Don't try this stall type again
            }
            stall.categoryCount = countProperties(stall.categories); // Store number of categories
            stall.goodCount = countProperties(stall.goods); // Store number of goods
            stall.markup = 1 + Math.random()*0.4 + stall.weight / marketStallTypes[msTypeKey].capacity;
        }
        // Remove empty stall types
        for(var stKey in chosenStallTypes) { if(!chosenStallTypes.hasOwnProperty(stKey)) { continue; }
            if(chosenStallTypes[stKey].goodCount < 1) { delete chosenStallTypes[stKey]; } }
//        console.log('pre-combine:',angular.copy(chosenStallTypes));
        // Combine similar under-capacity stalls
        for(var cs1Key in chosenStallTypes) { if(!chosenStallTypes.hasOwnProperty(cs1Key)) { continue; }
            var stall1 = chosenStallTypes[cs1Key];
            for(var cs2Key in chosenStallTypes) {
                if(!chosenStallTypes.hasOwnProperty(cs2Key) || cs1Key == cs2Key) { continue; }
                var stall2 = chosenStallTypes[cs2Key];
                if(stall2.weight > marketStallTypes[stall2.stallType].capacity / 1.5) { continue; }
                if(stall2.weight > 
                    marketStallTypes[stall1.stallType].capacity - stall1.weight ) { continue; }
                // Candidate stall is less than 3/4 capacity and not too heavy
                var combinedCats = angular.copy(stall1.categories);
                for(var s2CatKey in stall2.categories) { // Combine stall categories
                    if(!stall2.categories.hasOwnProperty(s2CatKey)) { continue; }
                    combinedCats[s2CatKey] = stall2.categories[s2CatKey];
                }
                if(countProperties(combinedCats) > 6) { continue; } // If within 6-category limit
                var combinedGoods = angular.copy(stall1.goods);
                for(var s2GoodKey in stall2.goods) { // Combine stall goods
                    if(!stall2.goods.hasOwnProperty(s2GoodKey)) { continue; }
                    combinedGoods[s2GoodKey] = stall2.goods[s2GoodKey];
                }
                if(countProperties(combinedGoods) > 8) { continue; } // If within max good variety
                if(jQuery.inArray(stall2.stallType,similarMarketStalls[stall1.stallType]) < 0 &&
                    stall1.stallType != stall2.stallType) { continue; } // If similar or same
//                console.log('combining',cs1Key,'and',cs2Key);
                // All good, commence the combining!
                for(s2GoodKey in stall2.goods) {
                    if(!stall2.goods.hasOwnProperty(s2GoodKey)) { continue; }
                    var s2Good = stall2.goods[s2GoodKey];
                    var s2gCat = jQuery.inArray(s2Good.status,['pelt','meat']) < 0 ? 
                        s2Good.type == 'other' ? s2Good.name : s2Good.type : s2Good.status;
                    if(stall1.categories.hasOwnProperty(s2gCat)) { // Category exists
                        if(stall1.goods.hasOwnProperty(s2GoodKey)) { // Good exists
                            stall1.goods[s2GoodKey].amount += s2Good.amount; // Combine amounts
//                            console.log('    combining',s2GoodKey,'with existing');
                        } else { // Good doesn't exist
//                            console.log('    adding',s2GoodKey,'to existing cat');
                            stall1.goods[s2GoodKey] = s2Good;
                            stall1.categories[s2gCat].push(s2GoodKey); // Add good to cat goods
                            stall1.goodCount++; // Increment good count
                        }
                        stall1.categories[s2gCat][0] += s2Good.amount; // Add to good count
                    } else { // Category doesn't exist
//                        console.log('    adding',s2GoodKey,'with new cat',s2Good.type);
                        stall1.categories[s2gCat] = [s2Good.amount,s2GoodKey];
                        stall1.goods[s2GoodKey] = s2Good;
                        stall1.categoryCount++; // Increment category count
                        stall1.goodCount++; // Increment good count
                    }
                    stall1.weight += s2Good.weight * s2Good.amount; // Add weight to stall
                }
                stall1.combined = true; // Mark stall as a combined stall
                delete chosenStallTypes[cs2Key]; // Delete combined stall
            }
        }
//        console.log('post-combine:',angular.copy(chosenStallTypes));
        
//        console.log('remaining stall types:',angular.copy(chosenStallTypes),'remaining products:',productPool.list);
        var allGoods = {};
        var stalls = { sa: { goods: {} }, sb: { goods: {} }, sc: { goods: {} }, sd: { goods: {} },
            se: { goods: {} }, sf: { goods: {} }, sg: { goods: {} }, sh: { goods: {} }, si: { goods: {} }, 
            sj: { goods: {} }, sk: { goods: {} }, sl: { goods: {} }, sm: { goods: {} }, sn: { goods: {} } };
        // Assign final stall types to stall slots
        for(var stallKey in stalls) { if(!stalls.hasOwnProperty(stallKey)) { continue; }
            var chosenStallKey = pickProperty(chosenStallTypes);
            stalls[stallKey] = chosenStallTypes[chosenStallKey];
            for(var fsGoodKey in stalls[stallKey].goods) { // Average prices
                if(!stalls[stallKey].goods.hasOwnProperty(fsGoodKey)) { continue; }
                if(allGoods.hasOwnProperty(fsGoodKey)) {
                    allGoods[fsGoodKey].averagePrice = (allGoods[fsGoodKey].averagePrice + 
                        stalls[stallKey].goods[fsGoodKey].value * stalls[stallKey].markup)/2;
                    allGoods[fsGoodKey].total += stalls[stallKey].goods[fsGoodKey].amount;
                    allGoods[fsGoodKey].stallCount++; allGoods[fsGoodKey].stallList.push(stallKey);
                } else { allGoods[fsGoodKey] = { averagePrice: 
                    stalls[stallKey].goods[fsGoodKey].value * stalls[stallKey].markup,
                    total: stalls[stallKey].goods[fsGoodKey].amount, stallCount: 1, stallList: [stallKey] }; }
                if(stalls[stallKey].goods[fsGoodKey].exotic > 1.5) {
                    var direction = itemsMaster[fsGoodKey.split(':')[0]][fsGoodKey.split(':')[1]].nativeY - 
                        grid.split(':')[1] < 0 ? 'north' : 'south';
                    stalls[stallKey].exoticGood = fsGoodKey.split(':')[1]+':'+direction;
                }
            }
//            console.log(stallKey,'is a',stalls[stallKey].type,'stall - markup:',stalls[stallKey].markup);
            delete chosenStallTypes[chosenStallKey];
            if(countProperties(chosenStallTypes) < 1) { break; }
        }

        // Delete empty stalls
        for(var stallDelKey in stalls) { if(!stalls.hasOwnProperty(stallDelKey)) { continue; }
            if(!stalls[stallDelKey].hasOwnProperty('canvas')) { delete stalls[stallDelKey]; } }
        
        // Redistribute goods between like-stalls?
        
        var finalEconomy = { economyNodes: campNodes, message: '',
            market: { stalls: stalls, allGoods: allGoods, stallCount: countProperties(stalls) },
            blacksmith: { markup: campNodes.hasOwnProperty('mining camp') ?
                1 + 1 / campNodes['mining camp'].amount : null } };
//        console.log('final economy',angular.copy(finalEconomy));
        return finalEconomy;
    };

    var pickProduct = function(type,grid) { // Pick an event product based on rarity property
        var poolObject = type.split(':')[0] == 'event' ? angular.copy(eventProducts[type.split(':')[1]]) :
            angular.copy(itemsMaster[type.split(':')[0]]);
        var minRarity = 1;
        for(var poolKey in poolObject) { if(!poolObject.hasOwnProperty(poolKey)) { continue; }
            var thisRarity = poolObject[poolKey].hasOwnProperty('rarity') ? poolObject[poolKey].rarity :
                poolObject[poolKey].abundance*-1;
            minRarity = minRarity > thisRarity ? thisRarity : minRarity;
        }
        var picked = pickInObject(poolObject);
        if(picked.key.split(':').length > 1) {
            picked.type = picked.key.split(':')[0]; picked.name = picked.key.split(':')[1];
        } else { picked.type = type.split(':')[0] == 'event' ? type.split(':')[1] : type.split(':')[0];
            picked.name = picked.key; }
        picked = dressItem(picked);
        var rarity = picked.hasOwnProperty('rarity') ? (picked.rarity - minRarity) / (1-minRarity) :
            1 + picked.abundance / minRarity;
        var distance = picked.nativeY ? Math.abs(grid.split(':')[1] - picked.nativeY) : 0;
        var maxDistance = picked.nativeY ?
            picked.range + Math.random() * (picked.range) - (picked.range/2) : 1;
        var count = 0;
        var randomRarity = Math.random();
        while((rarity > randomRarity || distance > maxDistance) && count < 1000) { count++;
            picked = pickInObject(poolObject);
            if(picked.key.split(':').length > 1) {
                picked.type = picked.key.split(':')[0]; picked.name = picked.key.split(':')[1];
            } else { picked.type = type.split(':')[0] == 'event' ? type.split(':')[1] : type.split(':')[0];
                picked.name = picked.key; }
            picked = dressItem(picked);
            rarity = picked.hasOwnProperty('rarity') ? (picked.rarity - minRarity) / (1-minRarity) :
                1 + picked.abundance / minRarity;
            distance = picked.nativeY ? Math.abs(grid.split(':')[1] - picked.nativeY) : 0;
            maxDistance = picked.nativeY ?
                picked.range + Math.random() * (picked.range) - (picked.range/2) + count : 1;
        }
        picked.exotic = picked.nativeY && distance > picked.range ?
            Math.max(1,1 + (distance - picked.range) / (picked.range/2)) : 1;
        return picked;
    };

    var countProperties = function(object) { // Return number of properties an object has
        var count = 0; for(var key in object) { if(!object.hasOwnProperty(key)) { continue; } count++; } 
        return count; };
    // Return a random element from input array
    var pickInArray = function(array) { return array[Math.floor(Math.random()*array.length)]; };
    var pickInObject = function(object) { // Return a random property from input object (attach name)
        var array = [];
        for(var key in object) { if(object.hasOwnProperty(key)) { 
            var property = object[key]; property.key = key; array.push(property); } }
        return pickInArray(array);
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
        for(var i = Math.ceil(dist)*-1; i <= Math.ceil(dist); i++) {
            for(var ii = Math.ceil(dist)*-1; ii <= Math.ceil(dist); ii++) {
                if(dist*dist >= i*i + ii*ii) {
                    var pixel = { grid:(loc[0]+i)+':'+(loc[1]+ii), dist2: i*i + ii*ii, inBounds: true };
                    if(loc[0]+i < 0 && loc[0]+i > 299 && loc[1]+i < 0 && loc[1]+i > 299) { 
                        pixel.inBounds = false; }
                    neighbors.push(pixel);
                }
            }
        }
        return neighbors;
    };
    // Add item or array of items to inventory, stacking if possible, and send to firebase
    var addToInventory = function(invItems) {
        if(Object.prototype.toString.call(invItems) !== '[object Array]') { invItems = [invItems] }
        for(var i = 0; i < invItems.length; i++) {
            var invItem = invItems[i]; invItem.amount = parseInt(invItem.amount);
            var status = invItem.status ? ':' + invItem.status : '';
            if(scope.hasOwnProperty('inventory')) {
                for(var key in scope.inventory) { if(!scope.inventory.hasOwnProperty(key)) { continue; }
                    if(scope.inventory[key].name == invItem.name &&
                        scope.inventory[key].type == invItem.type &&
                        scope.inventory[key].status == invItem.status) {
                        scope.inventory[key].amount = parseInt(scope.inventory[key].amount) + invItem.amount;
                        invItem.amount = 0;
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
        var parent = itemsMaster[item.type][item.name];
        for(var key in parent) { if(!parent.hasOwnProperty(key)) { continue; } item[key] = parent[key]; }
        var eatKey = item.status ? item.name+':'+item.status : item.name;
        if(scope.user.hasOwnProperty('autoEat') &&
            jQuery.inArray(eatKey,scope.user.autoEat) >= 0) { item.autoEat = true; }
        var actions = getItemActions(item);
        item.hasActions = actions !== false;
        if(item.hasActions) { item.actions = actions; }
        return item;
    };
    var eviscerate = function(amount,animal,skill) {
        var products = [];
        if(Math.random()<skill/10 && jQuery.inArray('pelt',animal.classes) >= 0) {
            products.push({ type:animal.type, name:animal.name, status:'pelt', amount:parseInt(amount),
                weight: 1 + Math.floor(animal.weight/90), value: animal.value * 1.5,
                color: itemsMaster.animal[animal.name].color, exotic: animal.exotic }); }
        products.push({ type: animal.type, name: animal.name, status: 'meat', 
            weight: Math.round(2 + Math.floor(animal.weight/100)), 
            value: Math.round(2 + Math.floor(animal.weight/100)) * 5 + animal.value / 10,
            amount: randomIntRange(amount,amount*Math.ceil(Math.pow(animal.weight,1/3))),
            color: itemsMaster.animal[animal.name].color, exotic: animal.exotic });
        return products;
    };
    var getItemActions = function(item) {
        var actions = {};
        switch(item.type) {
            case 'animal':
                if(item.status || !scope.user.equipment || 
                    scope.user.equipment['small dagger'].condition <= 0) { return false; }
                actions.eviscerate = function(item,amount) {
                    if(amount < 1 || amount > item.amount || !parseInt(amount)) { return; }
                    amount = parseInt(amount);
                    console.log('eviscerating',amount,item.name);
                    if(item.amount - amount > 0) {
                        fireInventory.child(item.type+':'+item.name).set(item.amount - amount);
                        scope.inventory[item.type+':'+item.name].amount = item.amount - amount;
                    } else { fireInventory.child(item.type+':'+item.name).remove();
                        delete scope.inventory[item.type+':'+item.name]; }
                    Math.seedrandom();
                    scope.user.equipment['small dagger'].condition -= 5;
                    fireUser.child('equipment/small dagger').set(
                        scope.user.equipment['small dagger'].condition);
                    // TODO: Evisceration skill level
                    addToInventory(eviscerate(amount,item,5));
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
    var isCoast = function(grid) {
        if(!terrain.hasOwnProperty(grid)) { return false; }
        grid = {x: parseInt(grid.split(':')[0]), y: parseInt(grid.split(':')[1]) };
        for(var i = -1; i <= 1; i++) { for(var ii = -1; ii <= 1; ii++) {
            if(grid.x+i<0 || grid.x+i>299 || grid.y+ii<0 || grid.y+ii>299) { continue; } // Out of bounds
            if(!terrain.hasOwnProperty((grid.x+i)+':'+(grid.y+ii))) { return true; }
        }}
        return false;
    };
    var getNearWater = function(grid,distance) {
        grid = {x: parseInt(grid.split(':')[0]), y: parseInt(grid.split(':')[1]) };
        var inRange = getCircle([grid.x,grid.y],distance), nearWater = [];
        for(var i = 0; i < inRange.length; i++) {
            if(inRange[i].inBounds && !terrain.hasOwnProperty(inRange[i].grid)) { 
                nearWater.push(inRange[i].grid); }
        }
        return nearWater;
    };
    var getNearCoast = function(grid,distance) {
        grid = {x: parseInt(grid.split(':')[0]), y: parseInt(grid.split(':')[1]) };
        var inRange = getCircle([grid.x,grid.y],distance), nearCoast = [];
        for(var i = 0; i < inRange.length; i++) {
            if(inRange[i].inBounds && isCoast(inRange[i].grid)) { nearCoast.push(inRange[i].grid); }
        }
        return nearCoast;
    };
    var getNearAverageElevation = function(grid,distance) {
        grid = {x: parseInt(grid.split(':')[0]), y: parseInt(grid.split(':')[1]) };
        var inRange = getCircle([grid.x,grid.y],distance), count = 0, total = 0;
        for(var i = 0; i < inRange.length; i++) {
            if(inRange[i].inBounds && terrain.hasOwnProperty(inRange[i].grid)) { 
                count++; total += terrain[inRange[i].grid]; }
        }
        return count > 0 ? total/count : 0;
    };
    var getNearMiningAbundance = function(grid,distance) {
        var elevation = terrain[grid], slope = getSlope(grid), abundance = 0;
        Math.seedrandom('mine'+grid);
        if(distance == 0) {
            return elevation < 7 ? slope/5 * Math.random()/20 :
                Math.min(1,((slope + elevation/8) / 10)) * (Math.random()/10+0.9)
        } else {
            grid = {x: parseInt(grid.split(':')[0]), y: parseInt(grid.split(':')[1]) };
            var inRange = getCircle([grid.x,grid.y],distance);
            for(var i = 0; i < inRange.length; i++) { 
                if(!terrain.hasOwnProperty(inRange[i].grid) || !inRange[i].inBounds) { continue; }
                elevation = terrain[inRange[i].grid]; slope = getSlope(inRange[i].grid);
                var thisAbundance = elevation < 7 ? slope/5 * Math.random()/20 :
                    Math.min(1,((slope + elevation/8) / 10)) * (Math.random()/10+0.9);
                thisAbundance *= 1 - inRange[i].dist2 / 15; // Weakens over distance
                abundance += thisAbundance > 0.4 ? thisAbundance : 0;
            }
            return abundance;
        }
    };
    var getSlope = function(grid) {
        grid = {x: parseInt(grid.split(':')[0]), y: parseInt(grid.split(':')[1]) };
        var slope = 0;
        slope += Math.abs(terrain[(grid.x-1)+':'+grid.y]-terrain[grid.x+':'+grid.y]) || 0;
        slope += Math.abs(terrain[(grid.x+1)+':'+grid.y]-terrain[grid.x+':'+grid.y]) || 0;
        slope += Math.abs(terrain[grid.x+':'+(grid.y+1)]-terrain[grid.x+':'+grid.y]) || 0;
        slope += Math.abs(terrain[grid.x+':'+(grid.y-1)]-terrain[grid.x+':'+grid.y]) || 0;
        return slope;
    };
    var getNearest = function(ox,oy,near,exclude) {
        var nearest = {coords: '', dist: 999};
        for(var i = 0; i < near.length; i++) {
            var nx = near[i].split(':')[0], ny = near[i].split(':')[1];
            if(jQuery.inArray(nx+':'+ny,exclude) >= 0) { continue; }
            if(nx == ox && ny == oy) { continue; } // Not self
            if((nx - ox) * (nx - ox) + (ny - oy) * (ny - oy) < nearest.dist) {
                nearest.coords = near[i]; nearest.dist = (nx - ox) * (nx - ox) + (ny - oy) * (ny - oy);
            }
        }
        return nearest.coords;
    };
    var getCoastDistance = function(grid) { // Returns squared distance of nearest water
        grid = { ref: grid, x: parseInt(grid.split(':')[0]), y: parseInt(grid.split(':')[1]) };
        var searchDist = 0, nearWater;
        for(var i = 1; i < 50; i++) {
            nearWater = getNearWater(grid.ref,i*4);
            if(nearWater.length > 0) { searchDist = i*4; break; }
        }
        var closest = 50000;
        for(var w = 0; w < nearWater.length; w++) {
            var distX = Math.abs(nearWater[w].split(':')[0] - grid.x), 
                distY = Math.abs(nearWater[w].split(':')[1] - grid.y);
            closest = Math.min(closest,distX*distX + distY*distY);
            if(closest <= 1) { break; }
        }
        return closest;
    };
    var calculateFactor = function(grid,factor,resources) {
        var result = 1;
        var type = factor.split(':')[0], amount = factor.split(':')[1];
        switch(type) {
            case 'nearWater': result = 1/(getCoastDistance(grid)/4); break;
            case 'nearMountains': result = getNearMiningAbundance(grid,3.5)/2.5; break;
            case 'withLumberAndIron': 
                result = 2 * Math.min(30,resources.lumber.supply)/30 * Math.min(20,resources.iron.supply)/10;
                break;
            default: return 1; break;
        }
        return Math.max(0,amount * result);
    };
    var createEventPool = function(event) {
        var pool = [], number, i, product, item;
        var typesChosen = []; // Prevent 2 instances of same product, if necessary
        var coordsChosen = [];
        switch(event.type) {
            case 'forage':
                number = Math.max(Math.round(event.abundance * 3 + Math.random()*2*event.abundance),1);
                for(i = 0; i < number; i++) {
                    product = pickProduct('event:'+event.type,scope.user.location);
                    while(jQuery.inArray(product.name,typesChosen) >= 0) { // Prevent duplicates
                        product = pickProduct('event:'+event.type);
                    }
                    typesChosen.push(product.name);
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
                    product = pickProduct('event:'+event.type,scope.user.location);
                    item = { product: product,
                        targetX: randomIntRange(100,199), targetY: randomIntRange(100,199) };
                    pool.push(item);
                }
                break;
            case 'mine':
                number = Math.round(1 + event.abundance * 8 + Math.random()*8*event.abundance);
                for(i = 0; i < number; i++) {
                    product = pickProduct('event:'+event.type,scope.user.location);
                    product.status = 'unrefined';
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
            actCanvasUtility.clearAll();
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
        getVisibility: function(visible,coords) {
            var x = parseInt(coords.split(':')[0]), y = parseInt(coords.split(':')[1]);
            var inRange = getCircle([x,y],3.5);
            for(var key in visible) { // Set all pixels to explored
                if(visible.hasOwnProperty(key)) { visible[key] = visible[key] < 2 ? 
                    visible[key] == 1.5 ? 2.5 : 2 : visible[key]; }
            }
            for(var i = 0; i < inRange.length; i++) { // Set in-range pixels to visible
                if(!inRange[i].inBounds) { continue; } // Don't add out-of-bounds pixels
                visible[inRange[i].grid] = visible[inRange[i].grid] == 2 ? 1 : inRange[i].dist2 <= 5 ? 1 : 1.5;
            }
//            var remove = [];
//            for(var j = remove.length-1; j > -1; j--) { // Delete grids in remove array from inRange array
//                inRange.splice(remove[j],1);
//            }
            return visible;
        },
        getActivityAbundance: function(location,camps) {
            Math.seedrandom(location); // Consistent grid results
            var x = parseInt(location.split(':')[0]), y = parseInt(location.split(':')[1]);
            var elevation = terrain[location], slope = getSlope(location);
            var abundance = {
                forage: Math.min(1,7/elevation) * (Math.random()/2+0.5) * Math.max(0.05,(1-slope/16)), 
                hunt: Math.min(1,10/elevation) * (Math.random()*3/5+0.6) * Math.max(0.05,(1-slope/10)),
                mine: getNearMiningAbundance(location,0)
            };
            // TODO: Abstract these camp and coast proximity factors
            abundance.forage = isCampNear(camps,[x,y],1) ? abundance.forage * 0.8 : abundance.forage;
            abundance.hunt = isCampNear(camps,[x,y],1) ? abundance.hunt * 0.6 : abundance.hunt;
            var coastDist = getCoastDistance(location);
            abundance.forage = abundance.forage * (1-0.8*(1-Math.min(coastDist,3)/3)); // Less near coast
            abundance.hunt = abundance.hunt * (1-0.8*(1-Math.min(coastDist,9)/9)); // Less near coast
            
            return abundance;
        },
        createUserCamp: function(camps) {
            Math.seedrandom();
            for(var i = 0; i < 5000; i++) {
                var x = randomIntRange(20,279), y = randomIntRange(20,279);
                if(terrain[x+':'+y] && !camps[x+':'+y] && terrain[x+':'+y] < 10) { return x+':'+y; }
            }
            return false;
        },
        genNativeCamps: function() {
            var camps = []; var count = 0;
            for(var tKey in terrain) { if(!terrain.hasOwnProperty(tKey)) { continue; }
                count++; //if(count > 1000) { break; }
                var x = parseInt(tKey.split(':')[0]), y = parseInt(tKey.split(':')[1]);
                var area = parseInt(x/20) * 20 + ':' + parseInt(y/20) * 20;
                Math.seedrandom(area);
                var minRange = randomIntRange(8,15);
                if(Math.random() < 0.06) { minRange = randomIntRange(4,10) }
                if(isCampNear(camps,tKey.split(':'),minRange)) { continue; } // If camp nearby, veto this grid
                var nearGrids = getCircle(tKey.split(':'),2.5);
                var nearStats = { water: 0, avgElevation: 0 };
                for(var i = 0; i < nearGrids.length; i++) {
                    if(!nearGrids[i].inBounds) { continue; } // Don't examine out of bounds pixels
                    nearStats.water += terrain[nearGrids[i].grid] ? 0 : 1;
                    nearStats.avgElevation += terrain[nearGrids[i].grid] ? terrain[nearGrids[i].grid] : 0;
                    if(i == nearGrids.length - 1) {
                        nearStats.avgElevation /= 21 - nearStats.water;
                    }
                }
                var campChance = nearStats.water > 7 ? nearStats.water * 0.02 : (16-nearStats.water) / 100;
                campChance -= nearStats.avgElevation / 160; // Lower chance the higher elevation
                Math.seedrandom(tKey);
                if(Math.random() < campChance) {
                    camps.push(tKey); console.log('terrain',count,'-',tKey,'added - total:',camps.length);
                }
            }
            return camps;
        },
        expandCamp: function(grid) {
            Math.seedrandom(grid); // Deterministic based on grid
            var x = parseInt(grid.split(':')[0]), y = parseInt(grid.split(':')[1]);
            var economy = genCampEconomy(grid);
            return { economy: economy, type: 'camp', name: Chance(x*1000 + y).word(), grid: grid }
        },
        expandObjects: function(objects,grid) { // Generate traits and properties of objects
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
        marketMessage: {
            clear: function() { scope.onPixel.camp.economy.market.message = ''; },
            add: function(message,type) {
                scope.onPixel.camp.economy.market.message += '<p class="'+type+'">'+
                    replaceAll('b>','strong>',message)+'</p>'; },
            set: function(message,type) {
                scope.onPixel.camp.economy.market.message = '<p class="'+type+'">'+
                    replaceAll('b>','strong>',message)+'</p>'; }
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
        attachTerrain: function(localTerrain) { terrain = localTerrain; },
        attachInventory: function(inv) { userInventory = inv; },
        attachFireRef: function(ref) { fireRef = ref; },
        attachFireUser: function(user) { fireUser = user; },
        attachFireInventory: function(fireInv) { fireInventory = fireInv; },
        addToInventory: addToInventory, cleanInventory: cleanInventory, dressItem: dressItem,
        getItemActions: getItemActions, getSlope: getSlope, countProperties: countProperties,
        randomIntRange: randomIntRange, replaceAll: replaceAll,
        itemsMaster: itemsMaster, event: event,
        edibles: edibles, equipment: equipment
    }
});