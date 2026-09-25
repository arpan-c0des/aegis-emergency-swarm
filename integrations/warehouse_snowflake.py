import os
import json
from typing import Dict, Any, List
from dotenv import load_dotenv

load_dotenv()

class SnowflakeWarehouse:
    """Manages telemetry logging and incident analytics persistence to Snowflake."""

    def __init__(self):
        self.account = os.getenv("SNOWFLAKE_ACCOUNT")
        self.user = os.getenv("SNOWFLAKE_USER")
        self.password = os.getenv("SNOWFLAKE_PASSWORD")
        self.database = os.getenv("SNOWFLAKE_DATABASE", "AEGIS_DB")
        self.schema = os.getenv("SNOWFLAKE_SCHEMA", "PUBLIC")
        self.warehouse = os.getenv("SNOWFLAKE_WAREHOUSE", "COMPUTE_WH")
        self.conn = None

        if self.account and self.user and self.password:
            try:
                import snowflake.connector
                self.conn = snowflake.connector.connect(
                    user=self.user,
                    password=self.password,
                    account=self.account,
                    database=self.database,
                    schema=self.schema,
                    warehouse=self.warehouse
                )
                self._initialize_tables()
                print("[Snowflake] Connected successfully to warehouse.")
            except Exception as e:
                print(f"[Snowflake Warning] Could not connect directly to Snowflake: {e}")
                self.conn = None
        else:
            print("[Snowflake] Credentials incomplete in .env. Running in mock telemetry mode.")

    def _initialize_tables(self):
        """Ensures the tactical logging tables exist in the warehouse."""
        if not self.conn:
            return
        query = """
        CREATE TABLE IF NOT EXISTS AEGIS_AUDIT_LOGS (
            TIME_STEP INT,
            AGENT STRING,
            ACTION STRING,
            DETAILS VARIANT,
            TIMESTAMP TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
        );
        """
        with self.conn.cursor() as cur:
            cur.execute(query)

    def log_swarm_actions(self, time_step: int, actions: List[Dict[str, Any]]) -> bool:
        """Persists executed actions into the warehouse."""
        if not actions:
            return True

        if not self.conn:
            print(f"[Snowflake Mock] Logged {len(actions)} actions for tick {time_step} locally.")
            return True

        try:
            with self.conn.cursor() as cur:
                for action in actions:
                    log_data = action.get("log", {})
                    agent = log_data.get("agent", "Unknown")
                    action_name = log_data.get("action", "unknown_action")
                    details_json = json.dumps(log_data.get("details", {}))

                    query = """
                    INSERT INTO AEGIS_AUDIT_LOGS (TIME_STEP, AGENT, ACTION, DETAILS)
                    SELECT %s, %s, %s, PARSE_JSON(%s)
                    """
                    cur.execute(query, (time_step, agent, action_name, details_json))
            print(f"[Snowflake] Successfully committed {len(actions)} records.")
            return True
        except Exception as e:
            print(f"[Snowflake Error] Failed to write logs: {e}")
            return False