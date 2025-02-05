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
		
		// 1. 收集所有线条的交点
		var intersections = [];
		for(var i = 0; i < items.length; i++) {
			for(var j = i + 1; j < items.length; j++) {
				var curIntersections = items[i].getIntersections(items[j]);
				curIntersections.forEach(function(intersection) {
					intersections.push({
						point: intersection.point,
						path1: items[i],
						path2: items[j],
						offset1: intersection.offset,
						offset2: intersection.intersection.offset
					});
				});
			}
		}
		
		console.log('找到交点数量:', intersections.length);
		
		// 2. 为每条路径收集所有交点，并按偏移量排序
		var pathIntersections = new Map();
		items.forEach(function(path) {
			pathIntersections.set(path, []);
		});
		
		intersections.forEach(function(intersection) {
			pathIntersections.get(intersection.path1).push({
				point: intersection.point,
				offset: intersection.offset1
			});
			pathIntersections.get(intersection.path2).push({
				point: intersection.point,
				offset: intersection.offset2
			});
		});
		
		// 3. 分割每条路径并存储分段
		var segments = [];
		pathIntersections.forEach(function(points, path) {
			points.sort(function(a, b) {
				return a.offset - b.offset;
			});
			
			if(points.length > 0) {
				var lastPoint = path.firstSegment.point;
				points.forEach(function(intersection) {
					segments.push({
						start: lastPoint,
						end: intersection.point,
						style: {
							strokeColor: path.strokeColor,
							strokeWidth: path.strokeWidth
						}
					});
					lastPoint = intersection.point;
				});
				
				segments.push({
					start: lastPoint,
					end: path.lastSegment.point,
					style: {
						strokeColor: path.strokeColor,
						strokeWidth: path.strokeWidth
					}
				});
			}
		});
		
		// 4. 寻找闭合路径
		function findClosedPaths(segments, intersectionPoints) {
			var closedPaths = [];
			var usedSegments = new Set();
			var pathSignatures = new Set(); // 用于去重
			
			function getPathSignature(path) {
				// 创建路径的唯一签名，用于去重
				var points = path.map(p => p.segment.start.toString());
				points.sort();
				return points.join(',');
			}
			
			function findNextSegment(point, currentPath, startPoint) {
				// 如果回到起点，找到一个闭合路径
				if(currentPath.length > 0 && point.equals(startPoint)) {
					var signature = getPathSignature(currentPath);
					if(!pathSignatures.has(signature)) {
						pathSignatures.add(signature);
						closedPaths.push(currentPath.slice());
					}
					return;
				}
				
				// 查找连接到当前点的所有线段
				segments.forEach(function(segment, index) {
					if(usedSegments.has(index)) return;
					
					if(segment.start.equals(point)) {
						usedSegments.add(index);
						currentPath.push({segment: segment, reverse: false});
						findNextSegment(segment.end, currentPath, startPoint);
						currentPath.pop();
						usedSegments.delete(index);
					} else if(segment.end.equals(point)) {
						usedSegments.add(index);
						currentPath.push({segment: segment, reverse: true});
						findNextSegment(segment.start, currentPath, startPoint);
						currentPath.pop();
						usedSegments.delete(index);
					}
				});
			}
			
			// 从每个交点开始尝试寻找闭合路径
			intersections.forEach(function(intersection) {
				findNextSegment(intersection.point, [], intersection.point);
			});
			
			return closedPaths;
		}
		
		// 5. 创建闭合区域
		var closedPaths = findClosedPaths(segments, intersections);
		console.log('找到闭合路径数量:', closedPaths.length);
		
		// 创建实际的路径对象并检查重叠
		var pathObjects = closedPaths.map(function(pathSegments) {
			var path = new paper.Path();
			pathSegments.forEach(function(segment) {
				if(!segment.reverse) {
					path.add(segment.segment.start);
				} else {
					path.add(segment.segment.end);
				}
			});
			path.closed = true;
			return path;
		});
		
		// 移除重复的路径和包含其他路径的大区域
		var uniquePaths = [];
		for(var i = 0; i < pathObjects.length; i++) {
			var path1 = pathObjects[i];
			if(!path1) continue; // 跳过已被移除的路径
			
			var isMinimal = true;
			var isDuplicate = false;
			
			// 检查是否是重复的路径或者包含其他更小的路径
			for(var j = 0; j < pathObjects.length; j++) {
				if(i === j || !pathObjects[j]) continue;
				
				var path2 = pathObjects[j];
				
				if(path1.equals(path2)) {
					// 重复的路径
					isDuplicate = true;
					break;
				}
				
				if(path1.contains(path2.position)) {
					// path1 包含 path2，说明 path1 不是最小区域
					var isFullyContained = true;
					for(var k = 0; k < path2.segments.length; k++) {
						if(!path1.contains(path2.segments[k].point)) {
							isFullyContained = false;
							break;
						}
					}
					if(isFullyContained) {
						isMinimal = false;
						break;
					}
				}
			}
			
			if(!isDuplicate && isMinimal) {
				uniquePaths.push(path1);
			} else {
				path1.remove();
			}
		}
		
		console.log('去重并移除大区域后的路径数量:', uniquePaths.length);
		
		// 添加最小区域到组
		uniquePaths.forEach(function(path) {
			path.fillColor = new paper.Color(Math.random(), Math.random(), Math.random(), 0.5);
			path.strokeColor = 'black';
			group.addChild(path);
		});
		
		// 6. 添加原始线段
		segments.forEach(function(segment) {
			var path = new paper.Path({
				segments: [segment.start, segment.end],
				strokeColor: segment.style.strokeColor,
				strokeWidth: segment.style.strokeWidth
			});
			group.addChild(path);
		});
		
		if(replaceWithResult) {
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