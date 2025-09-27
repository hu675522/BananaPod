// Canvas性能优化工具
import type { Element, Point } from '../types';

// 节流函数 - 限制函数调用频率
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout | null = null;
    let lastExecTime = 0;
    
    return (...args: Parameters<T>) => {
        const currentTime = Date.now();
        
        if (currentTime - lastExecTime > delay) {
            func(...args);
            lastExecTime = currentTime;
        } else {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            timeoutId = setTimeout(() => {
                func(...args);
                lastExecTime = Date.now();
            }, delay - (currentTime - lastExecTime));
        }
    };
}

// 防抖函数 - 延迟执行，在指定时间内重复调用会重置计时器
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout | null = null;
    
    return (...args: Parameters<T>) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => func(...args), delay);
    };
}

// 请求动画帧节流 - 确保函数在每个动画帧最多执行一次
export function rafThrottle<T extends (...args: any[]) => any>(
    func: T
): (...args: Parameters<T>) => void {
    let rafId: number | null = null;
    let latestArgs: Parameters<T> | null = null;
    
    return (...args: Parameters<T>) => {
        latestArgs = args;
        
        if (rafId === null) {
            rafId = requestAnimationFrame(() => {
                if (latestArgs) {
                    func(...latestArgs);
                }
                rafId = null;
                latestArgs = null;
            });
        }
    };
}

// 批量DOM更新 - 收集多个更新操作，在下一个动画帧中批量执行
class BatchUpdater {
    private updates: (() => void)[] = [];
    private rafId: number | null = null;
    
    add(update: () => void) {
        this.updates.push(update);
        this.scheduleFlush();
    }
    
    private scheduleFlush() {
        if (this.rafId === null) {
            this.rafId = requestAnimationFrame(() => {
                this.flush();
            });
        }
    }
    
    private flush() {
        const updates = this.updates.slice();
        this.updates.length = 0;
        this.rafId = null;
        
        updates.forEach(update => update());
    }
}

export const batchUpdater = new BatchUpdater();

// 空间分区系统 - 用于快速碰撞检测
export class SpatialGrid {
    private cellSize: number;
    private grid: Map<string, Set<string>> = new Map();
    private elementBounds: Map<string, { x: number; y: number; width: number; height: number }> = new Map();
    
    constructor(cellSize: number = 100) {
        this.cellSize = cellSize;
    }
    
    // 获取网格坐标
    private getGridKey(x: number, y: number): string {
        const gridX = Math.floor(x / this.cellSize);
        const gridY = Math.floor(y / this.cellSize);
        return `${gridX},${gridY}`;
    }
    
    // 添加元素到空间网格
    addElement(elementId: string, bounds: { x: number; y: number; width: number; height: number }) {
        this.removeElement(elementId); // 先移除旧的位置
        this.elementBounds.set(elementId, bounds);
        
        // 计算元素覆盖的所有网格单元
        const startX = Math.floor(bounds.x / this.cellSize);
        const endX = Math.floor((bounds.x + bounds.width) / this.cellSize);
        const startY = Math.floor(bounds.y / this.cellSize);
        const endY = Math.floor((bounds.y + bounds.height) / this.cellSize);
        
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                const key = `${x},${y}`;
                if (!this.grid.has(key)) {
                    this.grid.set(key, new Set());
                }
                this.grid.get(key)!.add(elementId);
            }
        }
    }
    
    // 从空间网格中移除元素
    removeElement(elementId: string) {
        const bounds = this.elementBounds.get(elementId);
        if (!bounds) return;
        
        const startX = Math.floor(bounds.x / this.cellSize);
        const endX = Math.floor((bounds.x + bounds.width) / this.cellSize);
        const startY = Math.floor(bounds.y / this.cellSize);
        const endY = Math.floor((bounds.y + bounds.height) / this.cellSize);
        
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                const key = `${x},${y}`;
                const cell = this.grid.get(key);
                if (cell) {
                    cell.delete(elementId);
                    if (cell.size === 0) {
                        this.grid.delete(key);
                    }
                }
            }
        }
        
        this.elementBounds.delete(elementId);
    }
    
    // 查询指定区域内的元素
    queryRegion(x: number, y: number, width: number, height: number): Set<string> {
        const result = new Set<string>();
        
        const startX = Math.floor(x / this.cellSize);
        const endX = Math.floor((x + width) / this.cellSize);
        const startY = Math.floor(y / this.cellSize);
        const endY = Math.floor((y + height) / this.cellSize);
        
        for (let gridX = startX; gridX <= endX; gridX++) {
            for (let gridY = startY; gridY <= endY; gridY++) {
                const key = `${gridX},${gridY}`;
                const cell = this.grid.get(key);
                if (cell) {
                    cell.forEach(elementId => result.add(elementId));
                }
            }
        }
        
        return result;
    }
    
    // 查询点周围的元素
    queryPoint(x: number, y: number, radius: number = 0): Set<string> {
        return this.queryRegion(x - radius, y - radius, radius * 2, radius * 2);
    }
    
    // 清空网格
    clear() {
        this.grid.clear();
        this.elementBounds.clear();
    }
}

// 路径简化算法 - 减少路径点数量以提高渲染性能
export function simplifyPath(points: Point[], tolerance: number = 1): Point[] {
    if (points.length <= 2) return points;
    
    // Douglas-Peucker算法简化路径
    function douglasPeucker(points: Point[], tolerance: number): Point[] {
        if (points.length <= 2) return points;
        
        // 找到距离起点和终点连线最远的点
        let maxDistance = 0;
        let maxIndex = 0;
        const start = points[0];
        const end = points[points.length - 1];
        
        for (let i = 1; i < points.length - 1; i++) {
            const distance = pointToLineDistance(points[i], start, end);
            if (distance > maxDistance) {
                maxDistance = distance;
                maxIndex = i;
            }
        }
        
        // 如果最大距离大于容差，递归简化
        if (maxDistance > tolerance) {
            const left = douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
            const right = douglasPeucker(points.slice(maxIndex), tolerance);
            return left.slice(0, -1).concat(right);
        } else {
            return [start, end];
        }
    }
    
    return douglasPeucker(points, tolerance);
}

// 计算点到直线的距离
function pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) {
        return Math.sqrt(A * A + B * B);
    }
    
    const param = dot / lenSq;
    let xx: number, yy: number;
    
    if (param < 0) {
        xx = lineStart.x;
        yy = lineStart.y;
    } else if (param > 1) {
        xx = lineEnd.x;
        yy = lineEnd.y;
    } else {
        xx = lineStart.x + param * C;
        yy = lineStart.y + param * D;
    }
    
    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

// 视口裁剪 - 只渲染可见区域内的元素
export function getVisibleElements(
    elements: Element[],
    viewportBounds: { x: number; y: number; width: number; height: number },
    getElementBounds: (element: Element) => { x: number; y: number; width: number; height: number }
): Element[] {
    return elements.filter(element => {
        const bounds = getElementBounds(element);
        
        // 检查元素是否与视口相交
        return !(
            bounds.x + bounds.width < viewportBounds.x ||
            bounds.x > viewportBounds.x + viewportBounds.width ||
            bounds.y + bounds.height < viewportBounds.y ||
            bounds.y > viewportBounds.y + viewportBounds.height
        );
    });
}

// 性能监控器
export class PerformanceMonitor {
    private metrics: Map<string, number[]> = new Map();
    private maxSamples = 100;
    
    startTiming(label: string): () => void {
        const startTime = performance.now();
        
        return () => {
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            if (!this.metrics.has(label)) {
                this.metrics.set(label, []);
            }
            
            const samples = this.metrics.get(label)!;
            samples.push(duration);
            
            // 保持样本数量在限制内
            if (samples.length > this.maxSamples) {
                samples.shift();
            }
        };
    }
    
    getAverageTime(label: string): number {
        const samples = this.metrics.get(label);
        if (!samples || samples.length === 0) return 0;
        
        const sum = samples.reduce((a, b) => a + b, 0);
        return sum / samples.length;
    }
    
    getMetrics(): Record<string, { average: number; samples: number }> {
        const result: Record<string, { average: number; samples: number }> = {};
        
        this.metrics.forEach((samples, label) => {
            result[label] = {
                average: this.getAverageTime(label),
                samples: samples.length
            };
        });
        
        return result;
    }
    
    clear() {
        this.metrics.clear();
    }
}

export const performanceMonitor = new PerformanceMonitor();