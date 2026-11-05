/**
 * Ingest parsers (#201): one TCP message or one XML snapshot in, one ingest unit out (DERIVATIONS §0-§6).
 * Pure: no I/O, no clock. What needs earlier state (merge, retraction, generations, the leave rule) is the core's (#203).
 */
export { parseTcp } from './tcp.js';
export { parseXmlSnapshot } from './xml.js';
export type { IngestContext, IngestElement, CourseSlot } from './types.js';
export { createXmlReader } from './xml-reader.js';
export type { Clock, XmlFs, XmlReader, XmlReaderOptions, XmlReaderStatus, XmlSourceState } from './xml-reader.js';
