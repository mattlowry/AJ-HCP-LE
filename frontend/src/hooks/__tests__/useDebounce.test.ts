import { renderHook, act } from '@testing-library/react';
import useDebounce from '../useDebounce';

// Mock timers
jest.useFakeTimers();

describe('useDebounce', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  test('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    
    expect(result.current).toBe('initial');
  });

  test('debounces value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 }
      }
    );

    expect(result.current).toBe('initial');

    // Change the value
    rerender({ value: 'updated', delay: 500 });

    // Value should not change immediately
    expect(result.current).toBe('initial');

    // Fast-forward time by 400ms (less than delay)
    act(() => {
      jest.advanceTimersByTime(400);
    });

    // Value should still be the old value
    expect(result.current).toBe('initial');

    // Fast-forward time by another 200ms (total 600ms, more than delay)
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // Value should now be updated
    expect(result.current).toBe('updated');
  });

  test('resets timer on rapid value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 }
      }
    );

    // Change value rapidly
    rerender({ value: 'updated1', delay: 500 });
    
    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    rerender({ value: 'updated2', delay: 500 });
    
    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    rerender({ value: 'final', delay: 500 });

    // Should still have the initial value because timer keeps resetting
    expect(result.current).toBe('initial');

    // Now let the full delay pass
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Should have the final value
    expect(result.current).toBe('final');
  });

  test('works with different delay values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 1000 }
      }
    );

    rerender({ value: 'updated', delay: 1000 });

    // 500ms should not be enough
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current).toBe('initial');

    // 1000ms should be enough
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current).toBe('updated');
  });

  test('handles zero delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 0 }
      }
    );

    rerender({ value: 'updated', delay: 0 });

    // With zero delay, should update immediately after next tick
    act(() => {
      jest.advanceTimersByTime(0);
    });

    expect(result.current).toBe('updated');
  });

  test('works with non-string values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 42, delay: 300 }
      }
    );

    expect(result.current).toBe(42);

    rerender({ value: 84, delay: 300 });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current).toBe(84);
  });

  test('works with object values', () => {
    const initialObj = { name: 'John', age: 30 };
    const updatedObj = { name: 'Jane', age: 25 };

    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: initialObj, delay: 200 }
      }
    );

    expect(result.current).toBe(initialObj);

    rerender({ value: updatedObj, delay: 200 });

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current).toBe(updatedObj);
  });

  test('cleans up timeout on unmount', () => {
    const { result, rerender, unmount } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 }
      }
    );

    rerender({ value: 'updated', delay: 500 });

    // Unmount before timeout completes
    unmount();

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Should not throw or cause memory leaks
    expect(jest.getTimerCount()).toBe(0);
  });

  test('handles delay changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 }
      }
    );

    rerender({ value: 'updated', delay: 500 });

    // Wait 300ms
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Change delay to 200ms (should restart timer)
    rerender({ value: 'updated', delay: 200 });

    // Wait another 200ms (total 500ms from first change, but only 200ms from delay change)
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current).toBe('updated');
  });

  test('handles multiple rapid updates correctly', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 100 }
      }
    );

    // Simulate rapid typing
    const updates = ['a', 'ab', 'abc', 'abcd', 'abcde'];
    
    updates.forEach(update => {
      rerender({ value: update, delay: 100 });
      act(() => {
        jest.advanceTimersByTime(50); // Less than delay
      });
    });

    // Should still have initial value
    expect(result.current).toBe('initial');

    // Let the final timeout complete
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Should have the final value
    expect(result.current).toBe('abcde');
  });

  test('preserves reference equality for unchanged values', () => {
    const obj = { value: 'test' };
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: obj, delay: 100 }
      }
    );

    const initialResult = result.current;

    // Rerender with same object reference
    rerender({ value: obj, delay: 100 });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Should maintain reference equality
    expect(result.current).toBe(initialResult);
    expect(result.current).toBe(obj);
  });
});