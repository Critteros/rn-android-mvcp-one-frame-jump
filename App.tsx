import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useAnimatedValue,
} from 'react-native';
import ScrollViewInvalidation from './modules/scroll-view-invalidation/src/ScrollViewInvalidationModule';

// ScrollView with maintainVisibleContentPosition receives one new
// item at the top on an interval. The visible rows move down by one item height
// for one frame. Then they move back.
//
// The content copies the shape of LegendList v3, where the jump was first seen.
// Child 0 is a 0x0 anchor view at top = 1e7 + adjust. Child 1 is a wrapper with
// the total height. The wrapper holds absolutely positioned items. The native
// MVCP helper tracks child 0 and scrolls by the same distance the anchor moved.
// Only items near the tracked item are mounted.
//
// LegendList 3.3.x sources (https://github.com/LegendApp/legend-list/tree/main/src):
//   components/ListComponent.tsx        ScrollAdjust anchor, then Containers
//   components/Containers.native.tsx    ContainersLayer, Animated height
//   components/PositionView.native.tsx  absolutely positioned items
//
// The jump needs two conditions
// 1. The items and the anchor move in the same Fabric mount. Both come from the
//    `layout` state. A layout effect sets that state after the data commit. If
//    the items moved in one mount and the anchor in a later one, the rows would
//    shift for a whole frame because the correction comes later. That is a
//    different bug.
// 2. Nothing in that mount changes the size of the content container. The
//    wrapper height is an Animated.Value. The layout effect sets it before the
//    state, so it reaches native in its own update. If the height is a plain
//    style value, the size change lands in the same mount, the ScrollView gets
//    a new layout and a new display list, and the jump does not occur.
//
// Buttons:
//   "adding: on/off" starts and stops the inserts.
//   "every N ms" selects the interval. Values: 150, 500, 1000 ms.
//   "invalidate ScrollView after mount: on/off" forces every ScrollView to
//   invalidate after each Fabric mount (modules/scroll-view-invalidation).
//   This is not the patch itself. It shows that a same-frame invalidate
//   removes the jump. On: no jump.
//   "items" is the list length.

const ITEM_HEIGHT = 105;
const INITIAL_COUNT = 40;
const WINDOW = 15;
const INTERVALS = [150, 500, 1000];

export default function App() {
  const [ids, setIds] = useState(() =>
    Array.from({ length: INITIAL_COUNT }, (_, i) => INITIAL_COUNT - i),
  );
  const [adding, setAdding] = useState(true);
  const [interval, setIntervalMs] = useState(INTERVALS[0]);
  const [invalidate, setInvalidate] = useState(false);

  useEffect(() => {
    if (!adding) return;
    const t = setInterval(() => setIds((prev) => [prev[0] + 1, ...prev]), interval);
    return () => clearInterval(t);
  }, [adding, interval]);

  useEffect(() => ScrollViewInvalidation.setEnabled(invalidate), [invalidate]);

  // The data commit does not change what is visible. This state moves the items
  // and the anchor together in the next commit.
  const [layout, setLayout] = useState({ ids, adjust: 0 });
  const height = useAnimatedValue(INITIAL_COUNT * ITEM_HEIGHT);
  useLayoutEffect(() => {
    height.setValue(ids.length * ITEM_HEIGHT);
    setLayout({ ids, adjust: (ids.length - INITIAL_COUNT) * ITEM_HEIGHT });
  }, [ids, height]);

  // The item at index 0 at mount time. MVCP keeps it in view.
  const anchorId = useRef(ids[0]);
  const anchorIndex = layout.ids.indexOf(anchorId.current);

  return (
    <View style={styles.root}>
      <View style={styles.bar}>
        <Pressable onPress={() => setAdding((v) => !v)}>
          <Text style={styles.btn}>adding: {adding ? 'on' : 'off'}</Text>
        </Pressable>
        <Pressable
          onPress={() =>
            setIntervalMs((v) => INTERVALS[(INTERVALS.indexOf(v) + 1) % INTERVALS.length])
          }
        >
          <Text style={styles.btn}>every {interval} ms</Text>
        </Pressable>
        <Pressable onPress={() => setInvalidate((v) => !v)}>
          <Text style={styles.btn}>
            invalidate ScrollView after mount: {invalidate ? 'on' : 'off'}
          </Text>
        </Pressable>
        <Text style={styles.btn}>items: {ids.length}</Text>
      </View>
      <ScrollView maintainVisibleContentPosition={{ minIndexForVisible: 0 }}>
        <View style={{ position: 'absolute', top: 1e7 + layout.adjust, width: 0, height: 0 }} />
        <Animated.View style={{ height }}>
          {layout.ids.map(
            (id, i) =>
              Math.abs(i - anchorIndex) <= WINDOW && (
                <View
                  key={id}
                  style={[
                    styles.item,
                    { top: i * ITEM_HEIGHT, backgroundColor: id % 2 ? '#dbeafe' : '#fde68a' },
                  ]}
                >
                  <Text style={styles.text}>item {id}</Text>
                </View>
              ),
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: 60, backgroundColor: '#fff' },
  bar: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', paddingBottom: 8 },
  btn: { fontSize: 16, fontWeight: '600', padding: 8 },
  item: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  text: { fontSize: 20 },
});
