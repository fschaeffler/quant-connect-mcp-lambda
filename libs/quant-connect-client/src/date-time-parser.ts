import dot from 'dot-object'

const QC_DATE_TIME_REGEX = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?Z?$/

/** Transform received date-time strings from `YYYY-MM-DD HH:mm:ss` to ISO-string.
 *
 * @example
 * const obj = {
 *   date1: '2023-10-05 14:30:00',
 *   nested: {
 *     date2: '2023-10-05 14:30:00.123Z',
 *     notADate: 'Hello World',
 *   },
 *   dateArray: ['2023-10-05 14:30:00', 'Not a date', '2023-10-05 15:45:30.456'],
 * }
 *
 * console.log(fixDateStrings(obj))
 * // {
 * //   date1: '2023-10-05T14:30:00Z',
 * //   nested: {
 * //     date2: '2023-10-05T14:30:00.123Z',
 * //     notADate: 'Hello World',
 * //   },
 * //   dateArray: ['2023-10-05T14:30:00Z', 'Not a date', '2023-10-05T15:45:30.456Z'],
 * // }
 *
 * @param obj The object to transform
 * @returns A new object with the transformed date-time strings
 */
export const fixDateStrings = <T>(obj: T): T => {
  if (obj === null || obj === undefined) {
    return obj
  }

  const objCopy = JSON.parse(JSON.stringify(obj))

  const objDotNotation = dot.dot(obj) as Record<string, any>

  Object.entries(objDotNotation).forEach(([key, value]) => {
    if (typeof value === 'string' && value.match(QC_DATE_TIME_REGEX)) {
      const [date, time] = value.split(' ')
      const isoString = `${date}T${time.endsWith('Z') ? time : time + 'Z'}`
      dot.set(key, isoString, objCopy)
    }
  })

  return objCopy as T
}
