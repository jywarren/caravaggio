precision highp float;

varying vec2 vTextureCoord;

uniform sampler2D uSampler;
uniform float uSlider;
uniform int uNdvi;
uniform int uSelectColormap;
uniform int uHsv;
uniform int uColormap;

vec4 rgb2hsv(vec4 c)
{
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec4(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x, 1.0);
}

vec4 hsv2rgb(vec4 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return vec4(c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y), 1.0);
}

void main(void)
{
    vec4 color = texture2D(uSampler, vTextureCoord);
    if (uColormap == 1)
    {
        color = vec4(vTextureCoord, 0.0, 0.0);
    }
    else if (uHsv == 1)
    {
        color = rgb2hsv(color);
    }
    float x = uSlider;
    float r = color.r * 0.2;
    float g = color.g * 0.15;
    float b = color.b * 0.1;
    float a = 1.0;
    float rr = @1@;
    float gg = @2@;
    float bb = @3@;
    if (uNdvi == 0)
    {
        color = vec4(rr, gg, bb, 1.0);
        gl_FragColor = (uHsv == 0) ? color : hsv2rgb(color);
    }
    else
    {
        gl_FragColor = vec4(r,g,b,a);
    }
}
