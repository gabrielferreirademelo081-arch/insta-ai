package br.com.kk.vistoriaev;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

/**
 * Salva uma cópia da foto na galeria pública (Imagens/<pasta>).
 * Android 10+: MediaStore, sem permissão; a cópia continua lá mesmo se o app for desinstalado.
 * Android 9 ou menor: grava o arquivo em Pictures/<pasta> (pede permissão de armazenamento) e avisa a galeria.
 */
@CapacitorPlugin(
    name = "Galeria",
    permissions = { @Permission(alias = "armazenamento", strings = { Manifest.permission.WRITE_EXTERNAL_STORAGE }) }
)
public class GaleriaPlugin extends Plugin {

    @PluginMethod
    public void salvarFoto(PluginCall call) {
        if (call.getString("base64") == null || call.getString("nome") == null) {
            call.reject("base64 e nome são obrigatórios");
            return;
        }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q && getPermissionState("armazenamento") != PermissionState.GRANTED) {
            requestPermissionForAlias("armazenamento", call, "aposPermissao");
            return;
        }
        salvar(call);
    }

    @PermissionCallback
    private void aposPermissao(PluginCall call) {
        if (getPermissionState("armazenamento") == PermissionState.GRANTED) salvar(call);
        else call.reject("Permissão de armazenamento negada");
    }

    private void salvar(PluginCall call) {
        String nome = call.getString("nome");
        String pasta = call.getString("pasta", "Vistoria EV");
        try {
            byte[] bytes = Base64.decode(call.getString("base64"), Base64.DEFAULT);
            JSObject ret = new JSObject();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentResolver resolver = getContext().getContentResolver();
                ContentValues cv = new ContentValues();
                cv.put(MediaStore.Images.Media.DISPLAY_NAME, nome);
                cv.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
                cv.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/" + pasta);
                cv.put(MediaStore.Images.Media.IS_PENDING, 1);
                Uri uri = resolver.insert(MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY), cv);
                if (uri == null) throw new Exception("MediaStore recusou o arquivo");
                try (OutputStream os = resolver.openOutputStream(uri)) {
                    if (os == null) throw new Exception("não abriu o arquivo de destino");
                    os.write(bytes);
                }
                cv.clear();
                cv.put(MediaStore.Images.Media.IS_PENDING, 0);
                resolver.update(uri, cv, null, null);
                ret.put("uri", uri.toString());
            } else {
                File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), pasta);
                if (!dir.exists() && !dir.mkdirs()) throw new Exception("não criou a pasta " + dir);
                File f = new File(dir, nome);
                try (OutputStream os = new FileOutputStream(f)) {
                    os.write(bytes);
                }
                MediaScannerConnection.scanFile(getContext(), new String[] { f.getAbsolutePath() }, new String[] { "image/jpeg" }, null);
                ret.put("uri", Uri.fromFile(f).toString());
            }
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Falha ao salvar na galeria: " + e.getMessage());
        }
    }
}
