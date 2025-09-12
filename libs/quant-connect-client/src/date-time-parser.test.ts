/* eslint-disable max-lines-per-function */
import { fixDateStrings } from './date-time-parser'

describe('fixDateStrings', () => {
  describe('basic date string transformations', () => {
    it('should transform a simple date string without milliseconds', () => {
      const input = { date: '2023-10-05 14:30:00' }
      const expected = { date: '2023-10-05T14:30:00Z' }
      expect(fixDateStrings(input)).toEqual(expected)
    })

    it('should transform a date string with milliseconds', () => {
      const input = { date: '2023-10-05 14:30:00.123' }
      const expected = { date: '2023-10-05T14:30:00.123Z' }
      expect(fixDateStrings(input)).toEqual(expected)
    })

    it('should preserve date string that already ends with Z', () => {
      const input = { date: '2023-10-05 14:30:00.123Z' }
      const expected = { date: '2023-10-05T14:30:00.123Z' }
      expect(fixDateStrings(input)).toEqual(expected)
    })

    it('should not transform invalid date strings', () => {
      const input = { notADate: 'Hello World' }
      expect(fixDateStrings(input)).toEqual(input)
    })

    it('should not transform non-string values', () => {
      const input = {
        number: 123,
        boolean: true,
        nullValue: null,
        undefinedValue: undefined,
      }
      expect(fixDateStrings(input)).toEqual(input)
    })
  })

  describe('nested object transformations', () => {
    it('should transform date strings in nested objects', () => {
      const input = {
        level1: {
          date: '2023-10-05 14:30:00',
          level2: {
            anotherDate: '2023-12-25 23:59:59.999',
            nonDate: 'text',
          },
        },
      }
      const expected = {
        level1: {
          date: '2023-10-05T14:30:00Z',
          level2: {
            anotherDate: '2023-12-25T23:59:59.999Z',
            nonDate: 'text',
          },
        },
      }
      expect(fixDateStrings(input)).toEqual(expected)
    })

    it('should handle deeply nested objects', () => {
      const input = {
        a: {
          b: {
            c: {
              d: {
                date: '2023-01-01 00:00:00',
              },
            },
          },
        },
      }
      const expected = {
        a: {
          b: {
            c: {
              d: {
                date: '2023-01-01T00:00:00Z',
              },
            },
          },
        },
      }
      expect(fixDateStrings(input)).toEqual(expected)
    })
  })

  describe('array transformations', () => {
    it('should transform date strings in arrays', () => {
      const input = {
        dates: ['2023-10-05 14:30:00', 'not a date', '2023-12-25 15:45:30.456'],
      }
      const expected = {
        dates: ['2023-10-05T14:30:00Z', 'not a date', '2023-12-25T15:45:30.456Z'],
      }
      expect(fixDateStrings(input)).toEqual(expected)
    })

    it('should handle arrays of objects with date strings', () => {
      const input = {
        items: [
          { id: 1, createdAt: '2023-10-05 14:30:00' },
          { id: 2, createdAt: '2023-10-06 15:45:30.123' },
          { id: 3, name: 'test' },
        ],
      }
      const expected = {
        items: [
          { id: 1, createdAt: '2023-10-05T14:30:00Z' },
          { id: 2, createdAt: '2023-10-06T15:45:30.123Z' },
          { id: 3, name: 'test' },
        ],
      }
      expect(fixDateStrings(input)).toEqual(expected)
    })

    it('should handle nested arrays', () => {
      const input = {
        matrix: [
          ['2023-01-01 12:00:00', 'text'],
          ['2023-02-01 13:00:00.500', 'another text'],
        ],
      }
      const expected = {
        matrix: [
          ['2023-01-01T12:00:00Z', 'text'],
          ['2023-02-01T13:00:00.500Z', 'another text'],
        ],
      }
      expect(fixDateStrings(input)).toEqual(expected)
    })
  })

  describe('edge cases', () => {
    it('should handle null input', () => {
      expect(fixDateStrings(null)).toBe(null)
    })

    it('should handle undefined input', () => {
      expect(fixDateStrings(undefined)).toBe(undefined)
    })

    it('should handle empty object', () => {
      const input = {}
      expect(fixDateStrings(input)).toEqual({})
    })

    it('should handle empty array', () => {
      const input = { arr: [] }
      expect(fixDateStrings(input)).toEqual({ arr: [] })
    })

    it('should not mutate the original object', () => {
      const input = { date: '2023-10-05 14:30:00' }
      const inputCopy = JSON.parse(JSON.stringify(input))
      const result = fixDateStrings(input)

      expect(input).toEqual(inputCopy)
      expect(result).not.toBe(input)
    })
  })

  describe('date format validation', () => {
    const testCases = [
      // Valid formats
      { input: '2023-10-05 14:30:00', shouldTransform: true, description: 'basic format' },
      { input: '2023-10-05 14:30:00.123', shouldTransform: true, description: 'with milliseconds' },
      { input: '2023-10-05 14:30:00.123456', shouldTransform: true, description: 'with microseconds' },
      { input: '2023-10-05 14:30:00Z', shouldTransform: true, description: 'with Z suffix' },
      { input: '2023-10-05 14:30:00.123Z', shouldTransform: true, description: 'with milliseconds and Z' },

      // Invalid formats (won't match regex)
      { input: '2023-10-05T14:30:00', shouldTransform: false, description: 'ISO format with T' },
      { input: '2023-10-05', shouldTransform: false, description: 'date only' },
      { input: '14:30:00', shouldTransform: false, description: 'time only' },
      { input: '2023/10/05 14:30:00', shouldTransform: false, description: 'slash separators' },
      { input: '05-10-2023 14:30:00', shouldTransform: false, description: 'day-month-year format' },
      { input: '2023-10-05 14:30', shouldTransform: false, description: 'missing seconds' },
      { input: '2023-10-05  14:30:00', shouldTransform: false, description: 'double space' },
      { input: '', shouldTransform: false, description: 'empty string' },
      { input: 'not a date at all', shouldTransform: false, description: 'random text' },

      // Invalid date values but valid format (will transform - this is by design)
      { input: '2023-13-05 14:30:00', shouldTransform: true, description: 'invalid month (format valid)' },
      { input: '2023-10-32 14:30:00', shouldTransform: true, description: 'invalid day (format valid)' },
      { input: '2023-10-05 25:30:00', shouldTransform: true, description: 'invalid hour (format valid)' },
      { input: '2023-10-05 14:60:00', shouldTransform: true, description: 'invalid minute (format valid)' },
      { input: '2023-10-05 14:30:60', shouldTransform: true, description: 'invalid second (format valid)' },
    ]

    testCases.forEach(({ input, shouldTransform, description }) => {
      it(`should ${shouldTransform ? 'transform' : 'not transform'} ${description}: "${input}"`, () => {
        const obj = { testValue: input }
        const result = fixDateStrings(obj)

        if (shouldTransform) {
          expect(result.testValue).not.toBe(input)
          expect(result.testValue).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/)
        } else {
          expect(result.testValue).toBe(input)
        }
      })
    })
  })

  describe('complex real-world scenarios', () => {
    it('should handle a complex QuantConnect API response structure', () => {
      const input = {
        backtest: {
          id: 12345,
          name: 'Test Strategy',
          created: '2023-10-05 14:30:00',
          completed: '2023-10-05 16:45:30.123',
          status: 'completed',
          results: {
            statistics: {
              startDate: '2023-01-01 00:00:00',
              endDate: '2023-12-31 23:59:59.999Z',
            },
            trades: [
              {
                symbol: 'SPY',
                entryTime: '2023-03-15 09:30:00',
                exitTime: '2023-03-15 16:00:00.500',
                profit: 125.5,
              },
              {
                symbol: 'AAPL',
                entryTime: '2023-03-16 10:15:30',
                exitTime: null,
                profit: -50.25,
              },
            ],
          },
          logs: [
            { timestamp: '2023-10-05 14:30:01', message: 'Backtest started' },
            { timestamp: '2023-10-05 16:45:29', message: 'Backtest completed' },
          ],
        },
      }

      const result = fixDateStrings(input)

      // Check that all date strings are transformed
      expect(result.backtest.created).toBe('2023-10-05T14:30:00Z')
      expect(result.backtest.completed).toBe('2023-10-05T16:45:30.123Z')
      expect(result.backtest.results.statistics.startDate).toBe('2023-01-01T00:00:00Z')
      expect(result.backtest.results.statistics.endDate).toBe('2023-12-31T23:59:59.999Z')
      expect(result.backtest.results.trades[0].entryTime).toBe('2023-03-15T09:30:00Z')
      expect(result.backtest.results.trades[0].exitTime).toBe('2023-03-15T16:00:00.500Z')
      expect(result.backtest.results.trades[1].entryTime).toBe('2023-03-16T10:15:30Z')
      expect(result.backtest.logs[0].timestamp).toBe('2023-10-05T14:30:01Z')
      expect(result.backtest.logs[1].timestamp).toBe('2023-10-05T16:45:29Z')

      // Check that non-date values are preserved
      expect(result.backtest.id).toBe(12345)
      expect(result.backtest.name).toBe('Test Strategy')
      expect(result.backtest.status).toBe('completed')
      expect(result.backtest.results.trades[0].symbol).toBe('SPY')
      expect(result.backtest.results.trades[0].profit).toBe(125.5)
      expect(result.backtest.results.trades[1].exitTime).toBe(null)
      expect(result.backtest.logs[0].message).toBe('Backtest started')
    })
  })
})
