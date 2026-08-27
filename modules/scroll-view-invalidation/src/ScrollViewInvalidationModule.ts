import { NativeModule, requireNativeModule } from 'expo';

declare class ScrollViewInvalidationModule extends NativeModule<{}> {
  // When enabled, invalidate every ReactScrollView after each Fabric mount.
  setEnabled(value: boolean): void;
}

export default requireNativeModule<ScrollViewInvalidationModule>('ScrollViewInvalidation');
