import MeditationWidgetModule from '../../modules/meditation-widget/src/MeditationWidgetModule';

const hasDiscoveryApi = () => (
  Boolean(MeditationWidgetModule)
  && typeof MeditationWidgetModule.isAddedAsync === 'function'
  && typeof MeditationWidgetModule.wasEverAddedAsync === 'function'
  && typeof MeditationWidgetModule.canRequestPinAsync === 'function'
  && typeof MeditationWidgetModule.requestPinAsync === 'function'
);

export const MeditationWidgetService = {
  isAvailable: hasDiscoveryApi,

  async getStatus() {
    if (!hasDiscoveryApi()) {
      return {
        available: false,
        added: false,
        everAdded: false,
        canRequestPin: false,
      };
    }

    // isAddedAsync also backfills the native ever-added marker for widgets
    // installed before this discovery flow shipped.
    const added = await MeditationWidgetModule.isAddedAsync();
    const [everAdded, canRequestPin] = await Promise.all([
      MeditationWidgetModule.wasEverAddedAsync(),
      MeditationWidgetModule.canRequestPinAsync(),
    ]);

    return { available: true, added, everAdded, canRequestPin };
  },

  async requestPin() {
    if (!hasDiscoveryApi()) return false;
    return MeditationWidgetModule.requestPinAsync();
  },
};
