/**
 * Suprime warnings conocidos de librerías upstream que aún no son
 * totalmente compatibles con React 19 + React Native Web.
 *
 * Estos mensajes son SOLO de desarrollo — en producción no aparecen.
 * No afectan al funcionamiento de la app.
 *
 * Fuentes conocidas:
 *  - react-native-svg: usa `transform-origin` como atributo SVG (válido en SVG,
 *    pero React 19 lo trata como prop DOM inválido)
 *  - react-native-gesture-handler / PanResponder: pasa `onResponder*` al DOM
 */
import { LogBox } from 'react-native';

LogBox.ignoreLogs([
  'Invalid DOM property',
  'Unknown event handler property',
  'transform-origin',
  'onResponder',
  'shadow* style props are deprecated',
  'props.pointerEvents is deprecated',
  '[Reanimated] Reduced motion',
  '[expo-notifications] Listening to push token',
]);
