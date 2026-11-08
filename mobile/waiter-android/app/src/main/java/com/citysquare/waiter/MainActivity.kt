package com.citysquare.waiter

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import android.widget.Button
import android.widget.TextView

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val title = findViewById<TextView>(R.id.title)
        val status = findViewById<TextView>(R.id.status)
        val orderButton = findViewById<Button>(R.id.orderButton)

        title.text = "City Square Waiter"
        status.text = "Local mode: online"

        orderButton.setOnClickListener {
            status.text = "Order queued for kitchen sync"
        }
    }
}
