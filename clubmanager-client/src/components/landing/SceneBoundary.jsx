import { Component } from 'react';

/**
 * Keeps a WebGL failure decorative. If the canvas cannot initialise - no GPU, a
 * blocked context, a driver crash - the hero copy and every CTA below it must
 * still work, so this swallows the error and renders nothing in its place.
 */
export default class SceneBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return null;
    }

    return this.props.children;
  }
}
