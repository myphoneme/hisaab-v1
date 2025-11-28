import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def check_db():
    engine = create_async_engine('postgresql+asyncpg://postgres:123456@localhost:5432/hisaab')
    try:
        async with engine.connect() as conn:
            # Check if company_settings table exists
            result = await conn.execute(
                text("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename='company_settings'")
            )
            row = result.fetchone()

            if row:
                print("✓ company_settings table exists")

                # Check table structure
                result = await conn.execute(
                    text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='company_settings' ORDER BY ordinal_position")
                )
                columns = result.fetchall()
                print(f"\nTable has {len(columns)} columns:")
                for col in columns:
                    print(f"  - {col[0]}: {col[1]}")

                # Check if any data exists
                result = await conn.execute(text("SELECT COUNT(*) FROM company_settings"))
                count = result.scalar()
                print(f"\nNumber of records: {count}")

            else:
                print("✗ company_settings table NOT found")
                print("\nAll tables in public schema:")
                result = await conn.execute(
                    text("SELECT tablename FROM pg_tables WHERE schemaname='public'")
                )
                tables = result.fetchall()
                for table in tables:
                    print(f"  - {table[0]}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_db())
