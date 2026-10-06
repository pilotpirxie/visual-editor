import { describe, expect, it } from 'vitest';
import { editorPath, parseRoute } from './router';

describe('parseRoute', () => {
  it.each([
    ['/', { name: 'home' }],
    ['/p/project-1/page-2', { name: 'editor', projectId: 'project-1', pageId: 'page-2' }],
    ['/p/project-1/page-2/', { name: 'editor', projectId: 'project-1', pageId: 'page-2' }],
    ['/p/project-1', { name: 'editor', projectId: 'project-1', pageId: null }],
    ['/p/', { name: 'not-found' }],
    ['/p/a/b/c', { name: 'not-found' }],
    ['/settings', { name: 'not-found' }],
  ])('parses %s', (pathname, expected) => {
    expect(parseRoute(pathname)).toEqual(expected);
  });

  it('round-trips editor paths', () => {
    expect(parseRoute(editorPath('project-1', 'page-2'))).toEqual({
      name: 'editor',
      projectId: 'project-1',
      pageId: 'page-2',
    });
  });
});
