import { describe, it, expect, vi } from 'vitest';
import { TypedEventEmitter } from '../TypedEventEmitter';

type TestEvents = {
  click: { x: number; y: number };
  message: string;
  empty: void;
};

class TestEmitter extends TypedEventEmitter<TestEvents> {
  // Expose emit for testing
  public testEmit<K extends keyof TestEvents>(event: K, data: TestEvents[K]) {
    this.emit(event, data);
  }
}

describe('TypedEventEmitter', () => {
  it('should call handler when event is emitted', () => {
    const emitter = new TestEmitter();
    const handler = vi.fn();

    emitter.on('message', handler);
    emitter.testEmit('message', 'hello');

    expect(handler).toHaveBeenCalledWith('hello');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should support multiple handlers for same event', () => {
    const emitter = new TestEmitter();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    emitter.on('message', handler1);
    emitter.on('message', handler2);
    emitter.testEmit('message', 'test');

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it('should not add duplicate handlers', () => {
    const emitter = new TestEmitter();
    const handler = vi.fn();

    emitter.on('message', handler);
    emitter.on('message', handler);
    emitter.testEmit('message', 'test');

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should remove handler with off()', () => {
    const emitter = new TestEmitter();
    const handler = vi.fn();

    emitter.on('message', handler);
    emitter.off('message', handler);
    emitter.testEmit('message', 'test');

    expect(handler).not.toHaveBeenCalled();
  });

  it('should fire once() handler only once', () => {
    const emitter = new TestEmitter();
    const handler = vi.fn();

    emitter.once('message', handler);
    emitter.testEmit('message', 'first');
    emitter.testEmit('message', 'second');

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('first');
  });

  it('should clear all listeners with removeAllListeners()', () => {
    const emitter = new TestEmitter();
    const handler = vi.fn();

    emitter.on('message', handler);
    emitter.on('click', vi.fn());
    emitter.removeAllListeners();
    emitter.testEmit('message', 'test');

    expect(handler).not.toHaveBeenCalled();
    expect(emitter.listenerCount('message')).toBe(0);
    expect(emitter.listenerCount('click')).toBe(0);
  });

  it('should clear specific event listeners', () => {
    const emitter = new TestEmitter();
    const msgHandler = vi.fn();
    const clickHandler = vi.fn();

    emitter.on('message', msgHandler);
    emitter.on('click', clickHandler);
    emitter.removeAllListeners('message');
    emitter.testEmit('message', 'test');
    emitter.testEmit('click', { x: 1, y: 2 });

    expect(msgHandler).not.toHaveBeenCalled();
    expect(clickHandler).toHaveBeenCalledTimes(1);
  });

  it('should report correct listener count', () => {
    const emitter = new TestEmitter();

    expect(emitter.listenerCount('message')).toBe(0);

    emitter.on('message', vi.fn());
    emitter.on('message', vi.fn());

    expect(emitter.listenerCount('message')).toBe(2);
  });

  it('should not throw if handler errors', () => {
    const emitter = new TestEmitter();
    const errorHandler = vi.fn(() => { throw new Error('handler error'); });
    const normalHandler = vi.fn();

    emitter.on('message', errorHandler);
    emitter.on('message', normalHandler);

    expect(() => emitter.testEmit('message', 'test')).not.toThrow();
    expect(normalHandler).toHaveBeenCalled();
  });
});
