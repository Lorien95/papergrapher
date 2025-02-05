pg.boolean = function() {
	
	var booleanUnite = function(items, replaceWithResult) {
		items = items || pg.selection.getSelectedItems();
		replaceWithResult = replaceWithResult || true;
		
		console.log('开始联集运算，图形数量:', items.length);
		
		var result;
		for(var i=0; i<items.length; i++) {
			if(i === 0) {
				result = items[0];
			}
			console.log('合并图形', i);
			var temp = items[i].unite(result, {insert:false});
			result.remove();
			result = temp;
			items[i].remove();
		}
		
		console.log('联集运算结果:', result);
		
		if(replaceWithResult) {
			applyReplaceWithResult(items, result);
		}
		
		return result;
	};
	
	
	var booleanIntersect = function(items, replaceWithResult) {
		items = items || pg.selection.getSelectedItems();
		replaceWithResult = replaceWithResult || true;
		
		var main;
		var result;
		for(var i=0; i<items.length; i++) {
			if(i === 0) {
				main = items[0];
			} else {
				result = items[i].intersect(main, {insert:false});
				if(i+1 < items.length) {
					main = result;
				}
			}
			main.remove();
			items[i].remove();
		}
		
		if(replaceWithResult) {
			applyReplaceWithResult(items, result);
		}
		return result;
	};
	
	
	var booleanSubtract = function(items, replaceWithResult) {
		items = items || pg.selection.getSelectedItems();
		replaceWithResult = replaceWithResult || true;
		
		var main = items[0];
		var rem = [];
		for(var i=0; i<items.length; i++) {
			if(i>0) {
				rem.push(items[i]);
			}
		}
		var over = booleanUnite(rem);
		
		var result = main.subtract(over, {insert:false});
		over.remove();
		main.remove();
		
		if(replaceWithResult) {
			applyReplaceWithResult(items, result);
		}
		
		return result;
	};
	
	
	var booleanExclude = function(items, replaceWithResult) {
		items = items || pg.selection.getSelectedItems();
		replaceWithResult = replaceWithResult || true;
		
		console.log('开始排除运算，图形数量:', items.length);
		
		var main = items[0];
		var result;
		for(var i=0; i<items.length; i++) {
			if(i > 0) {
				console.log('对图形', i, '进行排除运算');
				result = items[i].exclude(main, {insert:false});
				if(i+1 < items.length) {
					main = result;
				}
			}
			main.remove();
			items[i].remove();
		}
		
		console.log('排除运算结果:', result);
		
		if(replaceWithResult) {
			applyReplaceWithResult(items, result);
		}
		
		return result;
	};
	
	
	var booleanDivide = function(items, replaceWithResult) {
		items = items || pg.selection.getSelectedItems();
		replaceWithResult = replaceWithResult === undefined ? true : replaceWithResult;
		
		console.log('开始布尔分割操作');
		console.log('选中的图形数量:', items.length);
		
		var group = new paper.Group();
		
		// 辅助函数：计算n个图形的交集
		function getIntersection(itemIndices) {
			if (itemIndices.length === 0) return null;
			
			var result = items[itemIndices[0]].clone({insert: false});
			for (var i = 1; i < itemIndices.length; i++) {
				result = result.intersect(items[itemIndices[i]].clone({insert: false}), {insert: false});
			}
			
			// 从其他所有图形中减去
			for (var i = 0; i < items.length; i++) {
				if (!itemIndices.includes(i)) {
					result = result.subtract(items[i].clone({insert: false}), {insert: false});
				}
			}
			
			return result;
		}
		
		// 生成所有可能的组合
		function getCombinations(arr, k) {
			var combinations = [];
			
			function combine(start, combo) {
				if (combo.length === k) {
					combinations.push([...combo]);
					return;
				}
				
				for (var i = start; i < arr.length; i++) {
					combo.push(i);
					combine(i + 1, combo);
					combo.pop();
				}
			}
			
			combine(0, []);
			return combinations;
		}
		
		// 处理所有可能的组合（1个到n个图形的组合）
		for (var k = 1; k <= items.length; k++) {
			console.log('处理', k, '个图形的组合');
			var combinations = getCombinations([...Array(items.length).keys()], k);
			
			for (var combo of combinations) {
				var intersection = getIntersection(combo);
				if (intersection && intersection.segments && intersection.segments.length > 0) {
					intersection.strokeColor = 'black';
					intersection.fillColor = new paper.Color(Math.random(), Math.random(), Math.random(), 0.5);
					group.addChild(intersection);
					console.log('添加组合:', combo, '的交集');
				}
			}
		}
		
		console.log('最终组中的子元素数量:', group.children.length);
		
		if (replaceWithResult) {
			applyReplaceWithResult(items, group);
		}
		
		return group;
	};
	
	
	var applyReplaceWithResult = function(items, group) {
		jQuery.each(items, function(index, item) {
			item.remove();
		});
		pg.layer.getActiveLayer().addChild(group);
		
		pg.undo.snapshot('booleanOperation');
	};
	
	
	return {
		booleanUnite: booleanUnite,
		booleanIntersect: booleanIntersect,
		booleanSubtract: booleanSubtract,
		booleanExclude: booleanExclude,
		booleanDivide: booleanDivide
	};
	
}();