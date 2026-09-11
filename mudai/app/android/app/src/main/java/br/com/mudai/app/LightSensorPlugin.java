package br.com.mudai.app;

import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "LightSensor")
public class LightSensorPlugin extends Plugin implements SensorEventListener {
    private SensorManager sensorManager;
    private Sensor lightSensor;
    private float lastLux = -1f;

    @Override
    public void load() {
        sensorManager = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
        if (sensorManager != null) {
            lightSensor = sensorManager.getDefaultSensor(Sensor.TYPE_LIGHT);
        }
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (lightSensor == null) {
            call.reject("SENSOR_INDISPONIVEL", "Aparelho sem sensor de luz ambiente.");
            return;
        }
        sensorManager.registerListener(this, lightSensor, SensorManager.SENSOR_DELAY_NORMAL);
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        if (sensorManager != null) sensorManager.unregisterListener(this);
        call.resolve();
    }

    @PluginMethod
    public void getMaxRange(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("maxRange", lightSensor != null ? lightSensor.getMaximumRange() : 0);
        ret.put("disponivel", lightSensor != null);
        call.resolve(ret);
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() != Sensor.TYPE_LIGHT) return;
        lastLux = event.values[0];
        JSObject ret = new JSObject();
        ret.put("lux", lastLux);
        notifyListeners("lux", ret);
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {}
}
