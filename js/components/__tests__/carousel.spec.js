import { describe, it, expect } from 'vitest';
import { renderImageCarousel, renderVideoCarousel } from '../carousel.js';

describe('renderImageCarousel', () => {
  it('renders slides for each media_url', () => {
    const mod = {
      content_type: 'image_carousel',
      media_url: ['https://a.com/1.jpg', 'https://a.com/2.jpg'],
      bottom_content: {},
    };
    const html = renderImageCarousel(mod);
    expect(html).toContain('carousel__slide');
    expect(html).toContain('https://a.com/1.jpg');
    expect(html).toContain('https://a.com/2.jpg');
  });

  it('renders navigation arrows for multiple slides', () => {
    const mod = {
      content_type: 'image_carousel',
      media_url: ['https://a.com/1.jpg', 'https://a.com/2.jpg'],
      bottom_content: {},
    };
    const html = renderImageCarousel(mod);
    expect(html).toContain('carousel__arrow--prev');
    expect(html).toContain('carousel__arrow--next');
  });

  it('renders dot indicators for multiple slides', () => {
    const mod = {
      content_type: 'image_carousel',
      media_url: ['https://a.com/1.jpg', 'https://a.com/2.jpg', 'https://a.com/3.jpg'],
      bottom_content: {},
    };
    const html = renderImageCarousel(mod);
    expect(html).toContain('carousel__dot');
    // First dot should be active
    expect(html).toContain('carousel__dot--active');
  });

  it('hides controls for single slide', () => {
    const mod = {
      content_type: 'image_carousel',
      media_url: ['https://a.com/1.jpg'],
      bottom_content: {},
    };
    const html = renderImageCarousel(mod);
    expect(html).not.toContain('carousel__arrow');
    expect(html).not.toContain('carousel__dot');
    expect(html).not.toContain('carousel__counter');
  });

  it('renders counter showing "1 / N"', () => {
    const mod = {
      content_type: 'image_carousel',
      media_url: ['a', 'b', 'c'],
      bottom_content: {},
    };
    const html = renderImageCarousel(mod);
    expect(html).toContain('1 / 3');
  });

  it('renders captions when provided', () => {
    const mod = {
      content_type: 'image_carousel',
      media_url: ['https://a.com/1.jpg'],
      bottom_content: { carousel_captions: ['Caption text here'] },
    };
    const html = renderImageCarousel(mod);
    expect(html).toContain('carousel__caption');
    expect(html).toContain('Caption text here');
  });

  it('handles empty media_url', () => {
    const mod = { content_type: 'image_carousel', media_url: [], bottom_content: {} };
    const html = renderImageCarousel(mod);
    expect(html).toContain('carousel__track');
    expect(html).not.toContain('carousel__arrow');
  });

  it('handles missing media_url', () => {
    const mod = { content_type: 'image_carousel', bottom_content: {} };
    const html = renderImageCarousel(mod);
    expect(html).toContain('carousel__track');
  });

  it('renders reading text panel when provided', () => {
    const mod = {
      content_type: 'image_carousel',
      media_url: ['a'],
      bottom_content: { reading_text: '<p>Story text</p>' },
    };
    const html = renderImageCarousel(mod);
    expect(html).toContain('reel-player__reading');
    expect(html).toContain('Story text');
  });

  it('omits reading panel when no reading_text', () => {
    const mod = {
      content_type: 'image_carousel',
      media_url: ['a'],
      bottom_content: {},
    };
    const html = renderImageCarousel(mod);
    expect(html).not.toContain('reel-player__reading');
  });
});

describe('renderVideoCarousel', () => {
  it('renders video elements instead of images', () => {
    const mod = {
      content_type: 'video_carousel',
      media_url: ['https://a.com/1.mp4', 'https://a.com/2.mp4'],
      bottom_content: {},
    };
    const html = renderVideoCarousel(mod);
    expect(html).toContain('carousel__video');
    expect(html).toContain('id="carousel-video-0"');
    expect(html).toContain('id="carousel-video-1"');
    // Should NOT contain img tags
    expect(html).not.toContain('carousel__img');
  });
});
