package expo.modules.scrollviewinvalidation

import android.view.View
import android.view.ViewGroup
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.UIManager
import com.facebook.react.bridge.UIManagerListener
import com.facebook.react.common.annotations.UnstableReactNativeAPI
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.common.UIManagerType
import com.facebook.react.views.scroll.ReactScrollView
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Forces every ReactScrollView to invalidate after each Fabric mount, through
// the experimental UIManagerListener API. The ScrollView then records a new
// display list with the scroll offset the MVCP helper set, in the same frame.
// This is a demonstration, not the patch. The patch is the same invalidate call
// after each scrollToPreservingMomentum in
// MaintainVisibleScrollPositionHelper.updateScrollPositionInternal.
@OptIn(UnstableReactNativeAPI::class)
class ScrollViewInvalidationModule : Module() {
  private var enabled = false

  override fun definition() = ModuleDefinition {
    Name("ScrollViewInvalidation")

    OnCreate {
      val context = appContext.reactContext as? ReactContext ?: return@OnCreate
      val uiManager = UIManagerHelper.getUIManager(context, UIManagerType.FABRIC) ?: return@OnCreate
      uiManager.addUIManagerEventListener(
        object : UIManagerListener {
          override fun didMountItems(uiManager: UIManager) {
            if (!enabled) return
            val root = appContext.currentActivity?.window?.decorView ?: return
            invalidateScrollViews(root)
          }

          override fun willMountItems(uiManager: UIManager) {}

          override fun willDispatchViewUpdates(uiManager: UIManager) {}

          override fun didDispatchMountItems(uiManager: UIManager) {}

          override fun didScheduleMountItems(uiManager: UIManager) {}
        }
      )
    }

    Function("setEnabled") { value: Boolean -> enabled = value }
  }

  private fun invalidateScrollViews(v: View) {
    if (v is ReactScrollView) v.invalidate()
    if (v is ViewGroup) for (i in 0 until v.childCount) invalidateScrollViews(v.getChildAt(i))
  }
}
