import { describe, it, expect } from 'vitest';
import { renderScrollableView } from '../scrollable-view.js';

describe('renderScrollableView', () => {
  it('renders text blocks with sanitized HTML', () => {
    const mod = {
      content_blocks: [
        { type: 'text', content: '<p>Hello</p>', order: 1 },
      ],
    };
    const html = renderScrollableView(mod);
    expect(html).toContain('scrollable-view__block--text');
    expect(html).toContain('<p>Hello</p>');
  });

  it('renders image blocks with lazy loading', () => {
    const mod = {
      content_blocks: [
        { type: 'image', url: 'https://example.com/img.jpg', order: 1 },
      ],
    };
    const html = renderScrollableView(mod);
    expect(html).toContain('scrollable-view__block--image');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('https://example.com/img.jpg');
  });

  it('renders video blocks with src for non-HLS', () => {
    const mod = {
      content_blocks: [
        { type: 'video', url: 'https://example.com/video.mp4', order: 1 },
      ],
    };
    const html = renderScrollableView(mod);
    expect(html).toContain('scrollable-view__block--video');
    expect(html).toContain('src="https://example.com/video.mp4"');
  });

  it('renders HLS video with data-hls attribute', () => {
    const mod = {
      content_blocks: [
        { type: 'video', url: 'https://example.com/stream.m3u8', order: 1 },
      ],
    };
    const html = renderScrollableView(mod);
    expect(html).toContain('data-hls="https://example.com/stream.m3u8"');
    expect(html).not.toContain('src="https://example.com/stream.m3u8"');
  });

  it('sorts blocks by order', () => {
    const mod = {
      content_blocks: [
        { type: 'text', content: 'Second', order: 2 },
        { type: 'text', content: 'First', order: 1 },
        { type: 'text', content: 'Third', order: 3 },
      ],
    };
    const html = renderScrollableView(mod);
    const firstIdx = html.indexOf('First');
    const secondIdx = html.indexOf('Second');
    const thirdIdx = html.indexOf('Third');
    expect(firstIdx).toBeLessThan(secondIdx);
    expect(secondIdx).toBeLessThan(thirdIdx);
  });

  it('handles empty content_blocks', () => {
    const html = renderScrollableView({ content_blocks: [] });
    expect(html).toContain('scrollable-view');
  });

  it('handles missing content_blocks', () => {
    const html = renderScrollableView({});
    expect(html).toContain('scrollable-view');
  });

  it('skips unknown block types', () => {
    const mod = {
      content_blocks: [
        { type: 'unknown_type', content: 'nope', order: 1 },
      ],
    };
    const html = renderScrollableView(mod);
    expect(html).not.toContain('nope');
  });

  it('sanitizes unsafe image URLs', () => {
    const mod = {
      content_blocks: [
        { type: 'image', url: 'javascript:alert(1)', order: 1 },
      ],
    };
    const html = renderScrollableView(mod);
    expect(html).not.toContain('javascript:');
  });

  it('adds autoplay and loop attributes when specified', () => {
    const mod = {
      content_blocks: [
        { type: 'video', url: 'https://x.com/v.mp4', order: 1, autoplay: true, loop: true },
      ],
    };
    const html = renderScrollableView(mod);
    expect(html).toContain('autoplay');
    expect(html).toContain('loop');
  });
});
