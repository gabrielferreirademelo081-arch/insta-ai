package br.com.kk.vistoriaev;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugin próprio: cópia das fotos na galeria (GaleriaPlugin.java).
        registerPlugin(GaleriaPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
